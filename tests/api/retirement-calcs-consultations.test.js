import { describe, it, expect, beforeAll } from 'vitest';
import { guest, newUser, testEmail, RETIREMENT_PLAN, futureDate, pastDate } from '../helpers.js';

describe('/api/retirement', () => {
  let agent;
  beforeAll(async () => { ({ agent } = await newUser('retire')); });

  it('requires login', async () => {
    expect((await guest().get('/api/retirement')).status).toBe(401);
    expect((await guest().put('/api/retirement').send(RETIREMENT_PLAN)).status).toBe(401);
  });

  it('saves and updates the plan with a projection', async () => {
    expect((await agent.get('/api/retirement')).body).toEqual({ plan: null, projection: null });
    const res = await agent.put('/api/retirement').send(RETIREMENT_PLAN);
    expect(res.status).toBe(200);
    expect(res.body.plan).toMatchObject({ current_age: 35, retirement_age: 60, current_savings: '200000.00' });
    expect(res.body.projection.years_to_retirement).toBe(25);
    expect(['On Track', 'Nearly There', 'Off Track']).toContain(res.body.projection.status);

    const updated = await agent.put('/api/retirement').send({ ...RETIREMENT_PLAN, monthly_contribution: '60000' });
    expect(updated.body.plan.monthly_contribution).toBe('60000.00');
    expect(updated.body.projection.on_track).toBe(true);
    expect(updated.body.projection.additional_monthly_needed).toBe(0);
  });

  it('accepts the edges of the allowed ranges', async () => {
    for (const plan of [
      { current_age: 18, retirement_age: 19, expected_return_pct: '0' },
      { current_age: 99, retirement_age: 100, expected_return_pct: '20' },
    ]) {
      const res = await agent.put('/api/retirement').send({ ...RETIREMENT_PLAN, ...plan });
      expect(res.status, JSON.stringify(plan)).toBe(200);
    }
  });

  it.each([
    ['retirement age below current age', { current_age: 50, retirement_age: 45 }, 'retirement_age'],
    ['retirement age equal to current age', { current_age: 50, retirement_age: 50 }, 'retirement_age'],
    ['current age under 18', { current_age: 17 }, 'current_age'],
    ['current age over 100', { current_age: 101, retirement_age: 102 }, 'current_age'],
    ['retirement age over 100', { retirement_age: 101 }, 'retirement_age'],
    ['non-whole age', { current_age: 35.5 }, 'current_age'],
    ['return below 0%', { expected_return_pct: '-1' }, 'expected_return_pct'],
    ['return above 20%', { expected_return_pct: '20.5' }, 'expected_return_pct'],
    ['negative savings', { current_savings: '-1' }, 'current_savings'],
    ['zero desired income', { desired_monthly_income: '0' }, 'desired_monthly_income'],
  ])('rejects %s', async (_, change, field) => {
    const res = await agent.put('/api/retirement').send({ ...RETIREMENT_PLAN, ...change });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
  });
});

describe('/api/calculations', () => {
  const sample = { calculator_type: 'mortgage', inputs: { 'Property Price (AED)': 1200000, Term: '25 Years' }, result: { 'Monthly Payment': 'AED 5,310' } };

  it('is only for logged-in users', async () => {
    expect((await guest().get('/api/calculations')).status).toBe(401);
    expect((await guest().post('/api/calculations').send(sample)).status).toBe(401);
  });

  it('saves and lists calculations newest first, and deletes them', async () => {
    const { agent } = await newUser('calc');
    expect((await agent.get('/api/calculations')).body.calculations).toEqual([]);
    const first = await agent.post('/api/calculations').send(sample);
    expect(first.status).toBe(201);
    expect(first.body.calculation).toMatchObject(sample);
    await agent.post('/api/calculations').send({ ...sample, calculator_type: 'net-worth' });
    const list = (await agent.get('/api/calculations')).body.calculations;
    expect(list.map((c) => c.calculator_type)).toEqual(['net-worth', 'mortgage']);
    expect((await agent.delete(`/api/calculations?id=${first.body.calculation.id}`)).status).toBe(200);
    expect((await agent.get('/api/calculations')).body.calculations).toHaveLength(1);
  });

  it('rejects unknown calculators and malformed inputs/results', async () => {
    const { agent } = await newUser('calc-bad');
    const bad = [
      { ...sample, calculator_type: 'lottery' },
      { ...sample, inputs: {} },
      { ...sample, inputs: [1, 2] },
      { ...sample, result: 'AED 5' },
      { ...sample, inputs: { nested: { a: 1 } } },
      { ...sample, inputs: Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`k${i}`, i])) },
      { ...sample, result: { long: 'x'.repeat(121) } },
    ];
    for (const payload of bad) expect((await agent.post('/api/calculations').send(payload)).status).toBe(400);
  });
});

describe('/api/consultations', () => {
  let serviceId;
  beforeAll(async () => { serviceId = (await guest().get('/api/services')).body.services[1].id; });

  const request = (overrides = {}) => ({
    name: 'Test Visitor',
    email: testEmail('consult'),
    phone: '+971 50 123 4567',
    service_id: serviceId,
    preferred_date: futureDate(0),
    message: 'I would like a retirement review.',
    ...overrides,
  });

  it('works when logged out', async () => {
    const res = await guest().post('/api/consultations').send(request());
    expect(res.status).toBe(201);
    expect(res.body.consultation.id).toBeGreaterThan(0);
  });

  it('works when logged in and appears in the member\'s own list', async () => {
    const { agent, email } = await newUser('consult-member');
    const res = await agent.post('/api/consultations').send(request({ email }));
    expect(res.status).toBe(201);
    const list = (await agent.get('/api/consultations')).body.consultations;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ service_name: 'Retirement Planning', status: 'new' });
  });

  it('accepts a general enquiry with only name and email', async () => {
    const res = await guest().post('/api/consultations').send({ name: 'Short Form', email: testEmail('consult-min') });
    expect(res.status).toBe(201);
  });

  it.each([
    ['missing name', { name: '' }, 'name'],
    ['one-letter name', { name: 'A' }, 'name'],
    ['invalid email', { email: 'not-an-email' }, 'email'],
    ['missing email', { email: '' }, 'email'],
    ['past preferred date', { preferred_date: pastDate(1) }, 'preferred_date'],
    ['invalid date', { preferred_date: '2026-13-01' }, 'preferred_date'],
    ['unknown service', { service_id: 999999 }, 'service_id'],
    ['invalid phone', { phone: '12' }, 'phone'],
    ['message too long', { message: 'x'.repeat(2001) }, 'message'],
  ])('rejects %s', async (_, change, field) => {
    const res = await guest().post('/api/consultations').send(request(change));
    expect(res.status).toBe(400);
    expect(res.body.field).toBe(field);
  });

  it('only lists consultations to logged-in members', async () => {
    expect((await guest().get('/api/consultations')).status).toBe(401);
  });
});
