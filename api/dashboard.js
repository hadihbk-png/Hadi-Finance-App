// GET /api/dashboard -> everything the "My Plan" page needs, for the logged-in user only.

import { query, queryOne } from './_lib/db.js';
import { route } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { calculateHealthScore, goalProgress, projectRetirement } from '../shared/finance.js';

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    const id = user.id;

    const [me, profile, goals, assessment, plan, calculations, consultations] = await Promise.all([
      queryOne('SELECT full_name, created_at FROM users WHERE id = $1', [id]),
      queryOne(
        `SELECT monthly_income, monthly_expenses, total_savings, total_investments, total_debt,
                monthly_debt_payments, emergency_fund, updated_at
         FROM financial_profiles WHERE user_id = $1`, [id]),
      query(
        `SELECT id, name, category, target_amount, current_amount, monthly_contribution,
                to_char(target_date, 'YYYY-MM-DD') AS target_date, status, created_at
         FROM goals WHERE user_id = $1 ORDER BY created_at DESC, id DESC`, [id]),
      queryOne(
        `SELECT a.score, a.risk_profile, a.created_at, p.name AS portfolio_name,
                p.expected_return_min, p.expected_return_max
         FROM risk_assessments a LEFT JOIN model_portfolios p ON p.risk_profile = a.risk_profile
         WHERE a.user_id = $1 ORDER BY a.created_at DESC, a.id DESC LIMIT 1`, [id]),
      queryOne(
        `SELECT current_age, retirement_age, current_savings, monthly_contribution, expected_return_pct,
                desired_monthly_income, retirement_years, inflation_pct, updated_at
         FROM retirement_plans WHERE user_id = $1`, [id]),
      query(
        `SELECT id, calculator_type, inputs, result, created_at FROM saved_calculations
         WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 5`, [id]),
      query(
        `SELECT c.id, s.name AS service_name, to_char(c.preferred_date, 'YYYY-MM-DD') AS preferred_date,
                c.status, c.created_at
         FROM consultation_requests c LEFT JOIN services s ON s.id = c.service_id
         WHERE c.user_id = $1 ORDER BY c.created_at DESC, c.id DESC LIMIT 3`, [id]),
    ]);

    const withProgress = goals.map((g) => ({ ...g, progress: goalProgress(g) }));
    const active = withProgress.filter((g) => g.status === 'active');
    const sum = (list, key) => list.reduce((t, g) => t + Number(g[key]), 0);

    res.status(200).json({
      user: { full_name: me?.full_name, member_since: me?.created_at },
      health: profile ? { ...calculateHealthScore(profile), updated_at: profile.updated_at } : null,
      goals: {
        total: goals.length,
        active: active.length,
        achieved: withProgress.filter((g) => g.status === 'achieved').length,
        target_total: sum(active, 'target_amount'),
        saved_total: sum(active, 'current_amount'),
        monthly_total: sum(active, 'monthly_contribution'),
        top: active.slice(0, 3),
      },
      risk: assessment,
      retirement: plan ? { plan, projection: projectRetirement(plan) } : null,
      calculations,
      consultations,
    });
  },
});
