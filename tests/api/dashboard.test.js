import { describe, it, expect } from 'vitest';
import { guest, newUser, STRONG_PROFILE, goalPayload, RETIREMENT_PLAN, uniformAnswers } from '../helpers.js';
import { calculateHealthScore, projectRetirement } from '../../shared/finance.js';

describe('/api/dashboard', () => {
  it('requires login', async () => {
    expect((await guest().get('/api/dashboard')).status).toBe(401);
  });

  it('is empty for a new member', async () => {
    const { agent } = await newUser('dash-empty');
    const res = await agent.get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ health: null, risk: null, retirement: null, calculations: [], consultations: [] });
    expect(res.body.goals).toMatchObject({ total: 0, active: 0, achieved: 0, target_total: 0, saved_total: 0 });
  });

  it('summarises health, goals, risk, retirement and recent calculations correctly', async () => {
    const { agent, email } = await newUser('dash-full');

    await agent.put('/api/profile').send(STRONG_PROFILE);
    const g1 = (await agent.post('/api/goals').send(goalPayload({ name: 'Home', target_amount: '400000', current_amount: '100000', monthly_contribution: '10000' }))).body.goal;
    await agent.post('/api/goals').send(goalPayload({ name: 'Japan trip', category: 'Travel', target_amount: '30000', current_amount: '6000', monthly_contribution: '2000' }));
    const g3 = (await agent.post('/api/goals').send(goalPayload({ name: 'Done goal', target_amount: '1000', current_amount: '0' }))).body.goal;
    await agent.patch(`/api/goals/${g3.id}`).send({ status: 'achieved' });
    const questions = (await agent.get('/api/risk')).body.questions;
    await agent.post('/api/risk').send({ answers: uniformAnswers(questions, 2) });
    await agent.put('/api/retirement').send(RETIREMENT_PLAN);
    for (let i = 0; i < 6; i++) {
      await agent.post('/api/calculations').send({ calculator_type: 'savings', inputs: { run: i }, result: { Projected: `AED ${i}` } });
    }
    await agent.post('/api/consultations').send({ name: 'Dash Member', email });

    const d = (await agent.get('/api/dashboard')).body;
    expect(d.health.score).toBe(calculateHealthScore(STRONG_PROFILE).score);
    expect(d.goals).toMatchObject({ total: 3, active: 2, achieved: 1, target_total: 430000, saved_total: 106000, monthly_total: 12000 });
    expect(d.goals.top.map((g) => g.name).sort()).toEqual(['Home', 'Japan trip']);
    expect(d.goals.top.find((g) => g.id === g1.id).progress.pct).toBe(25);
    expect(d.risk).toMatchObject({ score: 67, risk_profile: 'Growth', portfolio_name: 'Long-Term Growth Portfolio' });
    const expected = projectRetirement(RETIREMENT_PLAN);
    expect(d.retirement.projection.status).toBe(expected.status);
    expect(d.retirement.projection.projected_savings).toBe(expected.projected_savings);
    expect(d.calculations).toHaveLength(5);
    expect(d.calculations[0].inputs.run).toBe(5);
    expect(d.consultations).toHaveLength(1);
  });
});
