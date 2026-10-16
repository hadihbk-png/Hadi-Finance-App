// /api/goals            GET  list the user's goals
//                       POST create a goal
// /api/goals/:id        PUT    update a goal
//                       PATCH  { status } change status (e.g. mark achieved)
//                       DELETE remove a goal
// (/api/goals/:id is rewritten to /api/goals?id=:id in vercel.json)

import { query, queryOne } from './_lib/db.js';
import { route, body, money, text, date, oneOf, idParam, HttpError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { goalProgress } from '../shared/finance.js';

export const GOAL_CATEGORIES = ['Emergency Fund', 'Home', 'Education', 'Retirement', 'Travel', 'Wealth', 'Other'];
const STATUSES = ['active', 'achieved', 'paused'];

const COLUMNS = `id, name, category, target_amount, current_amount, monthly_contribution,
  to_char(target_date, 'YYYY-MM-DD') AS target_date, status, created_at`;

const withProgress = (g) => ({ ...g, progress: goalProgress(g) });

// An unchanged target date may already be in the past when editing an older goal.
function validateGoal(b, existingDate = null) {
  const goal = {
    name: text(b.name, 'name', 'Goal name', { max: 120, min: 2 }),
    category: oneOf(b.category, 'category', 'Category', GOAL_CATEGORIES),
    target_amount: money(b.target_amount, 'target_amount', 'Target amount', { positive: true }),
    current_amount: money(b.current_amount ?? 0, 'current_amount', 'Amount saved so far'),
    monthly_contribution: money(b.monthly_contribution ?? 0, 'monthly_contribution', 'Monthly contribution'),
    target_date: date(b.target_date, 'target_date', 'Target date', { required: false, future: b.target_date !== existingDate }),
    status: b.status ? oneOf(b.status, 'status', 'Status', STATUSES) : 'active',
  };
  return goal;
}

async function findOwned(userId, id) {
  const goal = await queryOne(`SELECT ${COLUMNS} FROM goals WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!goal) throw new HttpError(404, 'Goal not found.');
  return goal;
}

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    const goals = await query(
      `SELECT ${COLUMNS} FROM goals WHERE user_id = $1
       ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, created_at DESC`,
      [user.id]
    );
    res.status(200).json({ goals: goals.map(withProgress), categories: GOAL_CATEGORIES });
  },

  POST: async (req, res) => {
    const user = await requireUser(req);
    const g = validateGoal(body(req));
    const goal = await queryOne(
      `INSERT INTO goals (user_id, name, category, target_amount, current_amount, monthly_contribution, target_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${COLUMNS}`,
      [user.id, g.name, g.category, g.target_amount, g.current_amount, g.monthly_contribution, g.target_date, g.status]
    );
    res.status(201).json({ goal: withProgress(goal) });
  },

  PUT: async (req, res) => {
    const user = await requireUser(req);
    const id = idParam(req.query.id);
    const existing = await findOwned(user.id, id);
    const g = validateGoal(body(req), existing.target_date);
    const goal = await queryOne(
      `UPDATE goals SET name = $3, category = $4, target_amount = $5, current_amount = $6,
         monthly_contribution = $7, target_date = $8, status = $9
       WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
      [id, user.id, g.name, g.category, g.target_amount, g.current_amount, g.monthly_contribution, g.target_date, g.status]
    );
    res.status(200).json({ goal: withProgress(goal) });
  },

  PATCH: async (req, res) => {
    const user = await requireUser(req);
    const id = idParam(req.query.id);
    const existing = await findOwned(user.id, id);
    const status = oneOf(body(req).status, 'status', 'Status', STATUSES);
    // Marking a goal achieved also records it as fully funded.
    const current = status === 'achieved'
      ? (Number(existing.current_amount) >= Number(existing.target_amount) ? existing.current_amount : existing.target_amount)
      : existing.current_amount;
    const goal = await queryOne(
      `UPDATE goals SET status = $3, current_amount = $4 WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
      [id, user.id, status, current]
    );
    res.status(200).json({ goal: withProgress(goal) });
  },

  DELETE: async (req, res) => {
    const user = await requireUser(req);
    const id = idParam(req.query.id);
    const rows = await query('DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id', [id, user.id]);
    if (!rows.length) throw new HttpError(404, 'Goal not found.');
    res.status(200).json({ ok: true });
  },
});
