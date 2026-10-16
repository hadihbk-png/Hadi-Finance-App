// Login sessions: a signed JWT stored in an httpOnly cookie.

import { SignJWT, jwtVerify } from 'jose';
import { HttpError } from './http.js';

const COOKIE_NAME = 'finora_session';
const SESSION_DAYS = 7;

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new HttpError(500, 'Server login is not configured (JWT_SECRET missing).');
  }
  return new TextEncoder().encode(secret);
}

function isSecure() {
  return Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
}

export async function createSession(res, user) {
  const token = await new SignJWT({ name: user.full_name, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];
  if (isSecure()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSession(res) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecure()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

// Returns { id, name, email } for a valid session, or null.
export async function getSessionUser(req) {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { id, name: payload.name, email: payload.email };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    return null;
  }
}

export async function requireUser(req) {
  const user = await getSessionUser(req);
  if (!user) throw new HttpError(401, 'Please log in to continue.', { code: 'AUTH_REQUIRED' });
  return user;
}
