// GET    /api/calculations          -> the user's saved calculations (newest first)
// POST   /api/calculations          { calculator_type, inputs, result }
// DELETE /api/calculations?id=123
// Logged-in users only. The calculators themselves work without an account.

import { query, queryOne } from './_lib/db.js';
import { route, body, oneOf, idParam, ValidationError, HttpError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';

export const CALCULATOR_TYPES = ['net-worth', 'savings', 'compound-growth', 'mortgage', 'education'];

// Accepts a flat object of short labels -> numbers/strings, as produced by the calculators page.
function flatObject(value, field, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${label} must be an object.`, field);
  }
  const entries = Object.entries(value);
  if (!entries.length || entries.length > 30) throw new ValidationError(`${label} has an invalid number of fields.`, field);
  const clean = {};
  for (const [k, v] of entries) {
    if (typeof k !== 'string' || k.length > 60) throw new ValidationError(`${label} has an invalid field name.`, field);
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new ValidationError(`${label} contains an invalid number.`, field);
      clean[k] = v;
    } else if (typeof v === 'string' && v.length <= 120) {
      clean[k] = v;
    } else {
      throw new ValidationError(`${label} contains an invalid value.`, field);
    }
  }
  return clean;
}

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    const rows = await query(
      `SELECT id, calculator_type, inputs, result, created_at FROM saved_calculations
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [user.id]
    );
    res.status(200).json({ calculations: rows });
  },
  POST: async (req, res) => {
    const user = await requireUser(req);
    const b = body(req);
    const type = oneOf(b.calculator_type, 'calculator_type', 'Calculator', CALCULATOR_TYPES);
    const inputs = flatObject(b.inputs, 'inputs', 'Inputs');
    const result = flatObject(b.result, 'result', 'Result');
    const row = await queryOne(
      `INSERT INTO saved_calculations (user_id, calculator_type, inputs, result)
       VALUES ($1, $2, $3::jsonb, $4::jsonb) RETURNING id, calculator_type, inputs, result, created_at`,
      [user.id, type, JSON.stringify(inputs), JSON.stringify(result)]
    );
    res.status(201).json({ calculation: row });
  },
  DELETE: async (req, res) => {
    const user = await requireUser(req);
    const id = idParam(req.query.id);
    const rows = await query('DELETE FROM saved_calculations WHERE id = $1 AND user_id = $2 RETURNING id', [id, user.id]);
    if (!rows.length) throw new HttpError(404, 'Calculation not found.');
    res.status(200).json({ ok: true });
  },
});
