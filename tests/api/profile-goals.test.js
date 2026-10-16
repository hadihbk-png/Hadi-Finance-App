import { describe, it, expect, beforeAll } from 'vitest';
import { guest, newUser, STRONG_PROFILE, goalPayload, futureDate, pastDate } from '../helpers.js';

describe('/api/profile', () => {
  let agent;
  beforeAll(async () => { ({ agent } = await newUser('profile')); });

  it('requires login', async () => {
    expect((await guest().get('/api/profile')).status).toBe(401);
    expect((await guest().put('/api/profile').send(STRONG_PROFILE)).status).toBe(401);
  });

  it('returns an empty profile before anything is saved', async () => {
    const res = await agent.get('/api/profile');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ profile: null, health: null });
  });

  it('saves the profile and returns the health score', async () => {
    const res = await agent.put('/api/profile').send(STRONG_PROFILE);
    expect(res.status).toBe(200);
    expect(res.body.profile.monthly_income).toBe('45000.00');
    expect(res.body.health.score).toBe(100);
  });

  it('updates the existing profile instead of creating another', async () => {
    const res = await agent.put('/api/profile').send({ ...STRONG_PROFILE, monthly_expenses: '43000', emergency_fund: '0' });
    expect(res.status).toBe(200);
    expect(res.body.profile.monthly_expenses).toBe('43000.00');
    expect(res.body.health.score).toBeLessThan(100);
    const again = await agent.get('/api/profile');
    expect(again.body.profile.monthly_expenses).toBe('43000.00');
  });

  it('keeps exact decimal amounts (no floating point drift)', async () => {
    const res = await agent.put('/api/profile').send({ ...STRONG_PROFILE, total_savings: '0.10', total_investments: '1234567.89' });
    expect(res.body.profile.total_savings).toBe('0.10');
    expect(res.body.profile.total_investments).toBe('1234567.89');
  });

  it('accepts zero income and all zeros, with a score between 0 and 100', async () => {
    const zeros = Object.fromEntries(Object.keys(STRONG_PROFILE).map((k) => [k, '0']));
    for (const p of [zeros, { ...zeros, monthly_expenses: '5000', monthly_debt_payments: '2000' }]) {
      const res = await agent.put('/api/profile').send(p);
      expect(res.status).toBe(200);
      expect(res.body.health.score).toBeGreaterThanOrEqual(0);
      expect(res.body.health.score).toBeLessThanOrEqual(100);
    }
  });

  it.each([
    ['negative', '-1'],
    ['non-numeric', 'abc'],
    ['three decimals', '10.123'],
    ['scientific notation', '1e5'],
    ['empty', ''],
    ['too large', '9999999999999'],
  ])('rejects a %s amount', async (_, value) => {
    const res = await agent.put('/api/profile').send({ ...STRONG_PROFILE, emergency_fund: value });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('emergency_fund');
  });

  it('rejects a missing field', async () => {
    const { monthly_income, ...rest } = STRONG_PROFILE;
    const res = await agent.put('/api/profile').send(rest);
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('monthly_income');
  });
});

describe('/api/goals', () => {
  let agent;
  beforeAll(async () => { ({ agent } = await newUser('goals')); });

  it('requires login', async () => {
    expect((await guest().get('/api/goals')).status).toBe(401);
    expect((await guest().post('/api/goals').send(goalPayload())).status).toBe(401);
  });

  it('starts empty and lists the allowed categories', async () => {
    const res = await agent.get('/api/goals');
    expect(res.body.goals).toEqual([]);
    expect(res.body.categories).toEqual(['Emergency Fund', 'Home', 'Education', 'Retirement', 'Travel', 'Wealth', 'Other']);
  });

  it('creates, edits, marks achieved and deletes a goal', async () => {
    const created = await agent.post('/api/goals').send(goalPayload());
    expect(created.status).toBe(201);
    const goal = created.body.goal;
    expect(goal).toMatchObject({ name: 'Home deposit', status: 'active', target_amount: '400000.00' });
    expect(goal.progress).toMatchObject({ pct: 25, remaining: 300000, monthsToGoal: 30 });

    const edited = await agent.put(`/api/goals/${goal.id}`).send(goalPayload({ name: 'Bigger deposit', target_amount: '500000', monthly_contribution: '20000' }));
    expect(edited.status).toBe(200);
    expect(edited.body.goal).toMatchObject({ id: goal.id, name: 'Bigger deposit', target_amount: '500000.00' });
    expect(edited.body.goal.progress.monthsToGoal).toBe(20);

    const achieved = await agent.patch(`/api/goals/${goal.id}`).send({ status: 'achieved' });
    expect(achieved.status).toBe(200);
    expect(achieved.body.goal.status).toBe('achieved');
    expect(achieved.body.goal.progress.pct).toBe(100);

    const paused = await agent.patch(`/api/goals/${goal.id}`).send({ status: 'paused' });
    expect(paused.body.goal.status).toBe('paused');

    expect((await agent.delete(`/api/goals/${goal.id}`)).status).toBe(200);
    expect((await agent.delete(`/api/goals/${goal.id}`)).status).toBe(404);
    expect((await agent.get('/api/goals')).body.goals).toEqual([]);
  });

  it('allows goals without a target date or contribution', async () => {
    const res = await agent.post('/api/goals').send(goalPayload({ target_date: '', monthly_contribution: '' }));
    expect(res.status).toBe(201);
    expect(res.body.goal.target_date).toBeNull();
    expect(res.body.goal.progress.monthsToGoal).toBeNull();
  });

  it.each(['0', '-100', '0.00', 'abc', ''])('rejects target_amount %j', async (target_amount) => {
    const res = await agent.post('/api/goals').send(goalPayload({ target_amount }));
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('target_amount');
  });

  it('rejects target dates in the past and invalid dates', async () => {
    for (const target_date of [pastDate(1), '2020-01-01', '2027-02-30', 'tomorrow']) {
      const res = await agent.post('/api/goals').send(goalPayload({ target_date }));
      expect(res.status).toBe(400);
      expect(res.body.field).toBe('target_date');
    }
    expect((await agent.post('/api/goals').send(goalPayload({ target_date: futureDate(0) }))).status).toBe(201);
  });

  it('rejects bad names, categories, statuses and negative amounts', async () => {
    expect((await agent.post('/api/goals').send(goalPayload({ name: '' }))).body.field).toBe('name');
    expect((await agent.post('/api/goals').send(goalPayload({ name: 'x'.repeat(121) }))).body.field).toBe('name');
    expect((await agent.post('/api/goals').send(goalPayload({ category: 'Cars' }))).body.field).toBe('category');
    expect((await agent.post('/api/goals').send(goalPayload({ current_amount: '-5' }))).body.field).toBe('current_amount');
    expect((await agent.post('/api/goals').send(goalPayload({ monthly_contribution: '-5' }))).body.field).toBe('monthly_contribution');
    const goal = (await agent.post('/api/goals').send(goalPayload())).body.goal;
    expect((await agent.patch(`/api/goals/${goal.id}`).send({ status: 'done' })).status).toBe(400);
  });

  it('returns 404 for invalid or unknown goal ids', async () => {
    for (const id of ['abc', '0', '-1', '99999999', '1.5']) {
      expect((await agent.delete(`/api/goals/${id}`)).status).toBe(404);
    }
  });

  it('stores names safely as text (no HTML is interpreted by the API)', async () => {
    const res = await agent.post('/api/goals').send(goalPayload({ name: '<img src=x onerror=alert(1)>' }));
    expect(res.status).toBe(201);
    expect(res.body.goal.name).toBe('<img src=x onerror=alert(1)>');
  });
});
