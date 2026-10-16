// GET /api/profile -> { profile, health }   (logged-in user only)
// PUT /api/profile -> save the financial profile, returns { profile, health }
import { query, queryOne } from './_lib/db.js';
import { route, body, money, ValidationError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { calculateHealthScore } from '../shared/finance.js';

const FIELDS = [
  ['monthly_income', 'Monthly income'],
  ['monthly_expenses', 'Monthly expenses'],
  ['total_savings', 'Total savings'],
  ['total_investments', 'Total investments'],
  ['total_debt', 'Total debt'],
  ['monthly_debt_payments', 'Monthly debt payments'],
  ['emergency_fund', 'Emergency fund'],
];

const COLUMNS = `${FIELDS.map(([f]) => f).join(', ')}, updated_at`;

export async function loadProfile(userId) {
  const profile = await queryOne(`SELECT ${COLUMNS} FROM financial_profiles WHERE user_id = $1`, [userId]);
  return { profile, health: profile ? calculateHealthScore(profile) : null };
}

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    res.status(200).json(await loadProfile(user.id));
  },
  PUT: async (req, res) => {
    const user = await requireUser(req);
    const b = body(req);
    const values = FIELDS.map(([field, label]) => money(b[field], field, label));
    if (Number(values[0]) <= 0) {
      throw new ValidationError('Monthly income must be greater than zero.', 'monthly_income');
    }
    await query(
      `INSERT INTO financial_profiles (user_id, ${FIELDS.map(([f]) => f).join(', ')}, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         ${FIELDS.map(([f]) => `${f} = EXCLUDED.${f}`).join(', ')}, updated_at = NOW()`,
      [user.id, ...values]
    );
    res.status(200).json(await loadProfile(user.id));
  },
});
