import { describe, it, expect } from 'vitest';
import { calculateHealthScore, goalProgress, projectRetirement, riskProfileForScore } from '../../shared/finance.js';

const ZERO = {
  monthly_income: 0, monthly_expenses: 0, monthly_debt_payments: 0,
  emergency_fund: 0, total_savings: 0, total_investments: 0, total_debt: 0,
};

const SAMPLES = {
  'strong saver': { ...ZERO, monthly_income: 50000, monthly_expenses: 20000, monthly_debt_payments: 1000, emergency_fund: 200000, total_investments: 900000 },
  'heavy debt': { ...ZERO, monthly_income: 20000, monthly_expenses: 14000, monthly_debt_payments: 9000, total_debt: 400000 },
  'zero income': { ...ZERO, monthly_expenses: 6000, monthly_debt_payments: 1500, emergency_fund: 10000, total_investments: 40000 },
  'all zeros': ZERO,
};

describe('health score', () => {
  it.each(Object.entries(SAMPLES))('%s stays between 0 and 100 with four parts of 0-25', (_, profile) => {
    const h = calculateHealthScore(profile);
    expect(Number.isInteger(h.score)).toBe(true);
    expect(h.score).toBeGreaterThanOrEqual(0);
    expect(h.score).toBeLessThanOrEqual(100);
    expect(h.parts).toHaveLength(4);
    for (const p of h.parts) {
      expect(p.points).toBeGreaterThanOrEqual(0);
      expect(p.points).toBeLessThanOrEqual(25);
      expect(p.explanation.length).toBeGreaterThan(10);
      expect(p.explanation).not.toMatch(/NaN|Infinity|undefined/);
      expect(p.value).not.toMatch(/NaN|Infinity/);
    }
  });

  it('gives a strong saver full marks', () => {
    const h = calculateHealthScore(SAMPLES['strong saver']);
    expect(h.score).toBe(100);
    expect(h.rating).toBe('Excellent');
  });

  it('scores heavy debt low, with debt-to-income flagged', () => {
    const h = calculateHealthScore(SAMPLES['heavy debt']);
    expect(h.score).toBeLessThan(20);
    expect(h.parts.find((p) => p.key === 'debt_to_income').status).toBe('poor');
  });

  it('handles zero income without dividing by zero', () => {
    const h = calculateHealthScore(SAMPLES['zero income']);
    expect(h.metrics.savings_rate_pct).toBe(0);
    expect(h.parts.find((p) => p.key === 'savings_rate').points).toBe(0);
    expect(h.parts.find((p) => p.key === 'debt_to_income').points).toBe(0);
  });

  it('accepts numeric strings exactly like numbers', () => {
    const asStrings = Object.fromEntries(Object.entries(SAMPLES['strong saver']).map(([k, v]) => [k, `${v}.00`]));
    expect(calculateHealthScore(asStrings).score).toBe(calculateHealthScore(SAMPLES['strong saver']).score);
  });
});

describe('goal progress', () => {
  it('calculates months to reach the goal from the monthly contribution', () => {
    expect(goalProgress({ target_amount: '100000', current_amount: '40000', monthly_contribution: '7000' }).monthsToGoal).toBe(9);
  });
  it('returns 0 months when already funded and null when nothing is contributed', () => {
    expect(goalProgress({ target_amount: '100', current_amount: '150', monthly_contribution: '0' }).monthsToGoal).toBe(0);
    expect(goalProgress({ target_amount: '100', current_amount: '10', monthly_contribution: '0' }).monthsToGoal).toBeNull();
  });
  it('caps progress at 100%', () => {
    expect(goalProgress({ target_amount: '100', current_amount: '250', monthly_contribution: '0' }).pct).toBe(100);
  });
});

describe('retirement projection', () => {
  it('compounds savings and contributions monthly', () => {
    // 0 savings, AED 1,000/month, 6% for 30 years ≈ AED 1,004,515
    const p = projectRetirement({ current_age: 30, retirement_age: 60, current_savings: 0, monthly_contribution: 1000, expected_return_pct: 6, desired_monthly_income: 1000, retirement_years: 25, inflation_pct: 2.5 });
    expect(p.projected_savings).toBeGreaterThan(1004000);
    expect(p.projected_savings).toBeLessThan(1005000);
  });

  it('closes the gap exactly when the suggested monthly amount is saved', () => {
    const plan = { current_age: 35, retirement_age: 60, current_savings: 100000, monthly_contribution: 2000, expected_return_pct: 6, desired_monthly_income: 25000, retirement_years: 25, inflation_pct: 2.5 };
    const p = projectRetirement(plan);
    expect(p.status).toBe('Off Track');
    const fixed = projectRetirement({ ...plan, monthly_contribution: p.total_monthly_needed });
    expect(fixed.funded_pct).toBeGreaterThanOrEqual(100);
    expect(Math.abs(fixed.gap)).toBeLessThan(5);
  });

  it('handles a 0% return without NaN', () => {
    const p = projectRetirement({ current_age: 40, retirement_age: 65, current_savings: 10000, monthly_contribution: 1000, expected_return_pct: 0, desired_monthly_income: 5000 });
    expect(p.projected_savings).toBe(10000 + 1000 * 25 * 12);
    for (const v of Object.values(p)) if (typeof v === 'number') expect(Number.isFinite(v)).toBe(true);
  });
});

describe('risk profile bands', () => {
  it.each([[0, 'Conservative'], [24, 'Conservative'], [25, 'Moderate'], [44, 'Moderate'], [45, 'Balanced'], [64, 'Balanced'], [65, 'Growth'], [81, 'Growth'], [82, 'Aggressive'], [100, 'Aggressive']])(
    'score %i is %s', (score, profile) => expect(riskProfileForScore(score)).toBe(profile));
});
