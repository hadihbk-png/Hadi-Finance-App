// User A must never be able to see, edit or delete user B's data.
import { describe, it, expect, beforeAll } from 'vitest';
import { newUser, STRONG_PROFILE, goalPayload, RETIREMENT_PLAN, uniformAnswers } from '../helpers.js';

describe('data isolation between users', () => {
  let a;
  let b;
  let goalA;
  let calcA;

  beforeAll(async () => {
    a = await newUser('owner-a');
    b = await newUser('intruder-b');

    await a.agent.put('/api/profile').send(STRONG_PROFILE);
    goalA = (await a.agent.post('/api/goals').send(goalPayload({ name: 'A private goal' }))).body.goal;
    const questions = (await a.agent.get('/api/risk')).body.questions;
    await a.agent.post('/api/risk').send({ answers: uniformAnswers(questions, 3) });
    await a.agent.put('/api/retirement').send(RETIREMENT_PLAN);
    calcA = (await a.agent.post('/api/calculations').send({ calculator_type: 'mortgage', inputs: { Price: 1 }, result: { Payment: 'AED 1' } })).body.calculation;
    await a.agent.post('/api/consultations').send({ name: 'Owner A', email: a.email, message: 'Private note from A' });
  });

  it("B's reads never include A's data", async () => {
    const bodies = await Promise.all(
      ['/api/profile', '/api/goals', '/api/risk', '/api/portfolios', '/api/retirement', '/api/calculations', '/api/consultations', '/api/dashboard', '/api/auth/me']
        .map((path) => b.agent.get(path).then((r) => JSON.stringify(r.body))),
    );
    for (const text of bodies) {
      expect(text).not.toContain('A private goal');
      expect(text).not.toContain('Private note from A');
      expect(text).not.toContain(a.email);
      expect(text).not.toContain('45000.00');
    }
    expect((await b.agent.get('/api/profile')).body.profile).toBeNull();
    expect((await b.agent.get('/api/goals')).body.goals).toEqual([]);
    expect((await b.agent.get('/api/risk')).body.history).toEqual([]);
    expect((await b.agent.get('/api/portfolios')).body.recommended).toBeNull();
    expect((await b.agent.get('/api/retirement')).body.plan).toBeNull();
    expect((await b.agent.get('/api/calculations')).body.calculations).toEqual([]);
    expect((await b.agent.get('/api/consultations')).body.consultations).toEqual([]);
  });

  it("B cannot edit, complete or delete A's goal", async () => {
    expect((await b.agent.put(`/api/goals/${goalA.id}`).send(goalPayload({ name: 'Hijacked' }))).status).toBe(404);
    expect((await b.agent.patch(`/api/goals/${goalA.id}`).send({ status: 'achieved' })).status).toBe(404);
    expect((await b.agent.delete(`/api/goals/${goalA.id}`)).status).toBe(404);
    // also via the ?id= form that the rewrite produces
    expect((await b.agent.delete(`/api/goals?id=${goalA.id}`)).status).toBe(404);

    const goals = (await a.agent.get('/api/goals')).body.goals;
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ id: goalA.id, name: 'A private goal', status: 'active' });
  });

  it("B cannot delete A's saved calculation", async () => {
    expect((await b.agent.delete(`/api/calculations?id=${calcA.id}`)).status).toBe(404);
    expect((await a.agent.get('/api/calculations')).body.calculations).toHaveLength(1);
  });

  it("B saving their own profile and plan never overwrites A's", async () => {
    await b.agent.put('/api/profile').send({ ...STRONG_PROFILE, monthly_income: '1000' });
    await b.agent.put('/api/retirement').send({ ...RETIREMENT_PLAN, current_age: 50, retirement_age: 70 });
    expect((await a.agent.get('/api/profile')).body.profile.monthly_income).toBe('45000.00');
    expect((await a.agent.get('/api/retirement')).body.plan.current_age).toBe(35);
  });

  it('ignores user ids supplied in the request body or query string', async () => {
    const res = await b.agent.post('/api/goals?user_id=1').send({ ...goalPayload({ name: 'B goal' }), user_id: a.user.id, id: goalA.id });
    expect(res.status).toBe(201);
    expect(res.body.goal.id).not.toBe(goalA.id);
    expect((await a.agent.get('/api/goals')).body.goals).toHaveLength(1);
    expect((await b.agent.get(`/api/profile?user_id=${a.user.id}`)).body.profile.monthly_income).toBe('1000.00');
  });
});
