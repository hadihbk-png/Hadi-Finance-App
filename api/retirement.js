// GET /api/retirement -> { plan, projection }   (logged-in user only)
// PUT /api/retirement -> save the plan, returns { plan, projection }

import { queryOne } from './_lib/db.js';
import { route, body, money, integer, decimal, ValidationError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { projectRetirement } from '../shared/finance.js';

const COLUMNS = `current_age, retirement_age, current_savings, monthly_contribution, expected_return_pct,
  desired_monthly_income, retirement_years, inflation_pct, updated_at`;

async function load(userId) {
  const plan = await queryOne(`SELECT ${COLUMNS} FROM retirement_plans WHERE user_id = $1`, [userId]);
  return { plan, projection: plan ? projectRetirement(plan) : null };
}

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    res.status(200).json(await load(user.id));
  },
  PUT: async (req, res) => {
    const user = await requireUser(req);
    const b = body(req);
    const current_age = integer(b.current_age, 'current_age', 'Current age', { min: 18, max: 100 });
    const retirement_age = integer(b.retirement_age, 'retirement_age', 'Retirement age', { min: 18, max: 100 });
    if (retirement_age <= current_age) {
      throw new ValidationError('Retirement age must be greater than your current age.', 'retirement_age');
    }
    const p = {
      current_savings: money(b.current_savings, 'current_savings', 'Current savings'),
      monthly_contribution: money(b.monthly_contribution, 'monthly_contribution', 'Monthly contribution'),
      expected_return_pct: decimal(b.expected_return_pct, 'expected_return_pct', 'Expected return', { min: 0, max: 20 }),
      desired_monthly_income: money(b.desired_monthly_income, 'desired_monthly_income', 'Desired monthly income', { positive: true }),
      retirement_years: integer(b.retirement_years ?? 25, 'retirement_years', 'Years in retirement', { min: 5, max: 45 }),
      inflation_pct: decimal(b.inflation_pct ?? '2.5', 'inflation_pct', 'Inflation', { min: 0, max: 10 }),
    };
    await queryOne(
      `INSERT INTO retirement_plans (user_id, current_age, retirement_age, current_savings, monthly_contribution,
         expected_return_pct, desired_monthly_income, retirement_years, inflation_pct, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         current_age = EXCLUDED.current_age, retirement_age = EXCLUDED.retirement_age,
         current_savings = EXCLUDED.current_savings, monthly_contribution = EXCLUDED.monthly_contribution,
         expected_return_pct = EXCLUDED.expected_return_pct, desired_monthly_income = EXCLUDED.desired_monthly_income,
         retirement_years = EXCLUDED.retirement_years, inflation_pct = EXCLUDED.inflation_pct, updated_at = NOW()
       RETURNING id`,
      [user.id, current_age, retirement_age, p.current_savings, p.monthly_contribution, p.expected_return_pct,
        p.desired_monthly_income, p.retirement_years, p.inflation_pct]
    );
    res.status(200).json(await load(user.id));
  },
});
