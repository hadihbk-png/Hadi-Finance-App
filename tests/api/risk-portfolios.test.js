import { describe, it, expect, beforeAll } from 'vitest';
import { guest, newUser, uniformAnswers } from '../helpers.js';

const ASSET_KEYS = ['equities_pct', 'fixed_income_pct', 'sukuk_pct', 'gold_pct', 'real_estate_pct', 'cash_pct'];

describe('/api/risk', () => {
  let agent;
  let questions;
  beforeAll(async () => {
    ({ agent } = await newUser('risk'));
    questions = (await agent.get('/api/risk')).body.questions;
  });

  it('requires login', async () => {
    expect((await guest().get('/api/risk')).status).toBe(401);
    expect((await guest().post('/api/risk').send({ answers: {} })).status).toBe(401);
  });

  it('returns all 10 questions in order, without the scoring points', async () => {
    expect(questions).toHaveLength(10);
    expect(questions.map((q) => q.order_index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const q of questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      for (const o of q.options) {
        expect(o.label).toBeTruthy();
        expect(o).not.toHaveProperty('points');
      }
    }
  });

  it.each([
    [0, 0, 'Conservative'],
    [1, 33, 'Moderate'],
    [2, 67, 'Growth'],
    [3, 100, 'Aggressive'],
  ])('answering option %i everywhere scores %i (%s)', async (index, score, profile) => {
    const res = await agent.post('/api/risk').send({ answers: uniformAnswers(questions, index) });
    expect(res.status).toBe(201);
    expect(res.body.assessment).toMatchObject({ score, risk_profile: profile });
    expect(res.body.portfolio.risk_profile).toBe(profile);
  });

  it('scores a mixed set of answers correctly (Balanced at 50)', async () => {
    // Half the answers worth 2 points and half worth 3: (25 - 10) / (40 - 10) = 50%
    const answers = Object.fromEntries(questions.map((q, i) => [q.id, i < 5 ? 1 : 2]));
    const res = await agent.post('/api/risk').send({ answers });
    expect(res.body.assessment).toMatchObject({ score: 50, risk_profile: 'Balanced' });
  });

  it('records history newest first', async () => {
    const res = await agent.get('/api/risk');
    expect(res.body.history.length).toBe(5);
    expect(res.body.history[0]).toMatchObject({ score: 50, risk_profile: 'Balanced' });
    expect(res.body.history.map((h) => h.risk_profile)).toEqual(['Balanced', 'Aggressive', 'Growth', 'Moderate', 'Conservative']);
  });

  it('rejects missing or invalid answers', async () => {
    const full = uniformAnswers(questions, 1);
    const missingOne = { ...full };
    delete missingOne[questions[9].id];
    const cases = [
      undefined,
      {},
      [],
      'abc',
      missingOne,
      { ...full, [questions[0].id]: 9 },
      { ...full, [questions[0].id]: -1 },
      { ...full, [questions[0].id]: 1.5 },
      { ...full, [questions[0].id]: 'two' },
    ];
    for (const answers of cases) {
      const res = await agent.post('/api/risk').send({ answers });
      expect(res.status, JSON.stringify(answers)).toBe(400);
    }
    expect((await agent.get('/api/risk')).body.history.length).toBe(5);
  });
});

describe('/api/portfolios', () => {
  it('requires login', async () => {
    expect((await guest().get('/api/portfolios')).status).toBe(401);
  });

  it('has 5 portfolios whose allocations add up to exactly 100%', async () => {
    const { agent } = await newUser('portfolio-sum');
    const res = await agent.get('/api/portfolios');
    expect(res.body.portfolios.map((p) => p.risk_profile)).toEqual(['Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive']);
    for (const p of res.body.portfolios) {
      // Sum in hundredths to avoid floating point rounding.
      const total = ASSET_KEYS.reduce((t, k) => t + Math.round(Number(p[k]) * 100), 0);
      expect(total, p.risk_profile).toBe(10000);
      expect(Number(p.expected_return_max)).toBeGreaterThan(Number(p.expected_return_min));
    }
  });

  it('returns no recommendation before an assessment', async () => {
    const { agent } = await newUser('portfolio-none');
    const res = await agent.get('/api/portfolios');
    expect(res.body.recommended).toBeNull();
    expect(res.body.assessment).toBeNull();
  });

  it("returns the portfolio for the user's latest risk profile", async () => {
    const { agent } = await newUser('portfolio-latest');
    const questions = (await agent.get('/api/risk')).body.questions;
    await agent.post('/api/risk').send({ answers: uniformAnswers(questions, 3) });
    expect((await agent.get('/api/portfolios')).body.recommended.risk_profile).toBe('Aggressive');
    await agent.post('/api/risk').send({ answers: uniformAnswers(questions, 0) });
    const res = await agent.get('/api/portfolios');
    expect(res.body.assessment.risk_profile).toBe('Conservative');
    expect(res.body.recommended).toMatchObject({ risk_profile: 'Conservative', name: 'Capital Preservation Portfolio' });
  });
});
