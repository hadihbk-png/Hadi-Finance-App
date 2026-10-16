// Shared request/response helpers for /api routes (Vercel-style handlers).

import { DatabaseUnavailableError } from './db.js';

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export class ValidationError extends HttpError {
  constructor(message, field) {
    super(400, message, field ? { field } : {});
  }
}

// Wraps a handler with method checking and consistent error responses.
// `handlers` maps HTTP methods to functions: { GET: fn, POST: fn }
export function route(handlers) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const fn = handlers[req.method];
    if (!fn) {
      res.setHeader('Allow', Object.keys(handlers).join(', '));
      return res.status(405).json({ error: 'Method not allowed.' });
    }
    try {
      await fn(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
}

function sendError(res, err) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err instanceof DatabaseUnavailableError) {
    console.error('[db] unavailable:', err.message);
    return res.status(503).json({
      error: "We can't reach the database right now. Please try again in a moment.",
      code: 'DB_UNAVAILABLE',
    });
  }
  // Postgres: table missing -> database has not been set up yet
  if (err && err.code === '42P01') {
    console.error('[db] missing table:', err.message);
    return res.status(503).json({
      error: 'The database has not been set up yet. Run "npm run db:setup".',
      code: 'DB_NOT_SETUP',
    });
  }
  if (err && err.code === '23503') {
    return res.status(401).json({ error: 'Your session is no longer valid. Please log in again.' });
  }
  console.error('[api] unexpected error:', err);
  return res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}

export function body(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch { throw new ValidationError('Request body must be valid JSON.'); }
  }
  if (typeof b !== 'object' || Array.isArray(b)) throw new ValidationError('Request body must be a JSON object.');
  return b;
}

// ---------------------------------------------------------------------------
// Validators. Each returns a clean value or throws ValidationError.
// ---------------------------------------------------------------------------

const MONEY_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

// Money stays a decimal string end to end so it never passes through floating point.
export function money(value, field, label, { required = true, min = 0, max = 999999999999.99, positive = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`${label} is required.`, field);
    return null;
  }
  const text = String(value).trim().replace(/,/g, '');
  if (text.startsWith('-')) throw new ValidationError(`${label} cannot be negative.`, field);
  if (!MONEY_PATTERN.test(text)) {
    throw new ValidationError(`${label} must be an amount in AED with up to 2 decimals.`, field);
  }
  const n = Number(text);
  if (positive && n <= 0) throw new ValidationError(`${label} must be greater than zero.`, field);
  if (n < min) throw new ValidationError(`${label} must be at least ${min}.`, field);
  if (n > max) throw new ValidationError(`${label} is too large.`, field);
  return text;
}

export function integer(value, field, label, { min, max, required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`${label} is required.`, field);
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n)) throw new ValidationError(`${label} must be a whole number.`, field);
  if (min !== undefined && n < min) throw new ValidationError(`${label} must be at least ${min}.`, field);
  if (max !== undefined && n > max) throw new ValidationError(`${label} must be at most ${max}.`, field);
  return n;
}

export function decimal(value, field, label, { min, max, required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`${label} is required.`, field);
    return null;
  }
  const text = String(value).trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) throw new ValidationError(`${label} must be a number.`, field);
  const n = Number(text);
  if (min !== undefined && n < min) throw new ValidationError(`${label} must be at least ${min}.`, field);
  if (max !== undefined && n > max) throw new ValidationError(`${label} must be at most ${max}.`, field);
  return text;
}

export function text(value, field, label, { required = true, max = 255, min = 0 } = {}) {
  const t = value === undefined || value === null ? '' : String(value).trim();
  if (!t) {
    if (required) throw new ValidationError(`${label} is required.`, field);
    return null;
  }
  if (t.length < min) throw new ValidationError(`${label} must be at least ${min} characters.`, field);
  if (t.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer.`, field);
  return t;
}

export function email(value, field = 'email') {
  const e = text(value, field, 'Email', { max: 255 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new ValidationError('Please enter a valid email address.', field);
  return e;
}

export function phone(value, field = 'phone') {
  const p = text(value, field, 'Phone', { required: false, max: 30 });
  if (p === null) return null;
  const digits = p.replace(/[\s\-().+]/g, '');
  if (!/^\d{7,15}$/.test(digits)) throw new ValidationError('Please enter a valid phone number.', field);
  return p;
}

// Accepts YYYY-MM-DD. Options: future (must be today or later), past (must be before today).
export function date(value, field, label, { required = true, future = false, past = false, maxYearsAhead = 60 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new ValidationError(`${label} is required.`, field);
    return null;
  }
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new ValidationError(`${label} must be a valid date.`, field);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new ValidationError(`${label} must be a valid date.`, field);
  }
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  if (future && d < today) throw new ValidationError(`${label} must be today or later.`, field);
  if (past && d >= today) throw new ValidationError(`${label} must be in the past.`, field);
  const limit = new Date(today);
  limit.setUTCFullYear(limit.getUTCFullYear() + maxYearsAhead);
  if (d > limit) throw new ValidationError(`${label} is too far in the future.`, field);
  if (d.getUTCFullYear() < 1900) throw new ValidationError(`${label} must be a valid date.`, field);
  return s;
}

export function oneOf(value, field, label, allowed) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${label} must be one of: ${allowed.join(', ')}.`, field);
  }
  return value;
}

export function idParam(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, 'Not found.');
  return n;
}
