// /api/auth/signup  POST  { full_name, email, password, phone?, date_of_birth? }
// /api/auth/login   POST  { email, password }
// /api/auth/logout  POST
// /api/auth/me      GET   -> { user } or { user: null }

import bcrypt from 'bcryptjs';
import { queryOne } from '../_lib/db.js';
import { route, body, text, email as emailField, phone as phoneField, date, HttpError, ValidationError } from '../_lib/http.js';
import { createSession, clearSession, getSessionUser } from '../_lib/auth.js';

// Used when an email isn't registered, so response timing doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('finora-timing-equaliser', 10);

const USER_COLUMNS = `id, email, full_name, phone, to_char(date_of_birth, 'YYYY-MM-DD') AS date_of_birth, created_at`;

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    first_name: String(u.full_name).split(/\s+/)[0],
    phone: u.phone,
    date_of_birth: u.date_of_birth,
    created_at: u.created_at,
  };
}

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) {
    throw new ValidationError('Password must be at least 8 characters.', 'password');
  }
  if (pw.length > 72) throw new ValidationError('Password must be 72 characters or fewer.', 'password');
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
    throw new ValidationError('Password must contain at least one letter and one number.', 'password');
  }
  return pw;
}

async function signup(req, res) {
  const b = body(req);
  const full_name = text(b.full_name, 'full_name', 'Full name', { min: 2, max: 120 });
  const email = emailField(b.email);
  const password = validatePassword(b.password);
  const phone = phoneField(b.phone);
  const dob = date(b.date_of_birth, 'date_of_birth', 'Date of birth', { required: false, past: true });
  if (dob) {
    const age = (Date.now() - new Date(`${dob}T00:00:00Z`).getTime()) / (365.25 * 24 * 3600 * 1000);
    if (age < 18) throw new ValidationError('You must be at least 18 years old to create an account.', 'date_of_birth');
    if (age > 110) throw new ValidationError('Please enter a valid date of birth.', 'date_of_birth');
  }

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) throw new HttpError(409, 'An account with this email already exists. Please log in.', { field: 'email' });

  const hash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await queryOne(
      `INSERT INTO users (email, password_hash, full_name, phone, date_of_birth)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${USER_COLUMNS}`,
      [email, hash, full_name, phone, dob]
    );
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'An account with this email already exists. Please log in.', { field: 'email' });
    throw err;
  }
  await createSession(res, user);
  res.status(201).json({ user: publicUser(user) });
}

async function login(req, res) {
  const b = body(req);
  const email = emailField(b.email);
  const password = typeof b.password === 'string' ? b.password : '';
  if (!password) throw new ValidationError('Password is required.', 'password');

  const row = await queryOne(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = $1`, [email]);
  const ok = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  if (!row || !ok) throw new HttpError(401, 'Incorrect email or password.');

  await createSession(res, row);
  res.status(200).json({ user: publicUser(row) });
}

async function logout(req, res) {
  clearSession(res);
  res.status(200).json({ ok: true });
}

async function me(req, res) {
  const session = await getSessionUser(req);
  if (!session) return res.status(200).json({ user: null });
  const row = await queryOne(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [session.id]);
  if (!row) {
    clearSession(res);
    return res.status(200).json({ user: null });
  }
  res.status(200).json({ user: publicUser(row) });
}

const ACTIONS = {
  signup: { POST: signup },
  login: { POST: login },
  logout: { POST: logout },
  me: { GET: me },
};

export default async function handler(req, res) {
  const action = ACTIONS[req.query.action];
  if (!action) return res.status(404).json({ error: 'Not found.' });
  return route(action)(req, res);
}
