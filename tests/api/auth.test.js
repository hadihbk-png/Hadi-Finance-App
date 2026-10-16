import { describe, it, expect } from 'vitest';
import { guest, newUser, testEmail, PASSWORD } from '../helpers.js';

const cookieHeader = (res) => (res.headers['set-cookie'] || []).join('; ');

describe('POST /api/auth/signup', () => {
  it('creates an account, logs in with an httpOnly cookie and hides the password hash', async () => {
    const agent = guest();
    const email = testEmail('signup');
    const res = await agent.post('/api/auth/signup').send({ full_name: 'Layla Test', email, password: PASSWORD, phone: '+971 50 123 4567', date_of_birth: '1990-05-01' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, full_name: 'Layla Test', first_name: 'Layla', date_of_birth: '1990-05-01' });
    expect(res.body.user).not.toHaveProperty('password_hash');
    const cookie = cookieHeader(res);
    expect(cookie).toMatch(/finora_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('stores the email in lower case', async () => {
    const email = testEmail('case');
    const res = await guest().post('/api/auth/signup').send({ full_name: 'Case Test', email: email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
  });

  it('blocks a duplicate email, including different upper/lower case', async () => {
    const { email } = await newUser('dup');
    for (const variant of [email, email.toUpperCase(), `  ${email.replace(/^v/, 'V')}  `]) {
      const res = await guest().post('/api/auth/signup').send({ full_name: 'Dup Test', email: variant, password: PASSWORD });
      expect(res.status).toBe(409);
      expect(res.body.field).toBe('email');
    }
  });

  it.each([
    ['empty', ''],
    ['missing', undefined],
    ['too short', 'Ab1'],
    ['letters only', 'passwordonly'],
    ['numbers only', '1234567890'],
  ])('blocks a weak password (%s)', async (_, password) => {
    const res = await guest().post('/api/auth/signup').send({ full_name: 'Weak Test', email: testEmail('weak'), password });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('password');
  });

  it.each(['', 'not-an-email', 'a@b', 'name@domain.', 'two@@finora.test'])('blocks an invalid email (%j)', async (email) => {
    const res = await guest().post('/api/auth/signup').send({ full_name: 'Email Test', email, password: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('email');
  });

  it('requires a name and rejects under-18 dates of birth', async () => {
    let res = await guest().post('/api/auth/signup').send({ full_name: '', email: testEmail('noname'), password: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('full_name');
    const young = new Date();
    young.setFullYear(young.getFullYear() - 10);
    res = await guest().post('/api/auth/signup').send({ full_name: 'Young Test', email: testEmail('young'), password: PASSWORD, date_of_birth: young.toISOString().slice(0, 10) });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe('date_of_birth');
  });
});

describe('POST /api/auth/login and /logout', () => {
  it('logs in with the right password (any email case)', async () => {
    const { email } = await newUser('login');
    const agent = guest();
    const res = await agent.post('/api/auth/login').send({ email: email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });

  it('fails with a wrong password or unknown email, with the same message', async () => {
    const { email } = await newUser('wrongpw');
    const wrong = await guest().post('/api/auth/login').send({ email, password: 'Wrong1234!' });
    const unknown = await guest().post('/api/auth/login').send({ email: testEmail('nobody'), password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toBe(unknown.body.error);
    expect(cookieHeader(wrong)).not.toMatch(/finora_session=[^;]+/);
  });

  it('logout clears the cookie and ends the session', async () => {
    const { agent } = await newUser('logout');
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(cookieHeader(res)).toMatch(/finora_session=;/);
    expect(cookieHeader(res)).toMatch(/Max-Age=0/);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    expect((await agent.get('/api/goals')).status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the user when logged in, never the password hash', async () => {
    const { agent, email } = await newUser('me');
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/);
  });

  it('returns 401 when logged out', async () => {
    const res = await guest().get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.user).toBeUndefined();
  });

  it('rejects a forged or tampered session cookie', async () => {
    const { agent } = await newUser('forged');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    const forged = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwibmFtZSI6IkhhY2tlciJ9.invalidsignature';
    const res = await guest().get('/api/auth/me').set('Cookie', `finora_session=${forged}`);
    expect(res.status).toBe(401);
    const none = await guest().get('/api/auth/me').set('Cookie', 'finora_session=eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.');
    expect(none.status).toBe(401);
  });

  it('only allows the expected HTTP methods', async () => {
    expect((await guest().get('/api/auth/login')).status).toBe(405);
    expect((await guest().post('/api/auth/me')).status).toBe(405);
    expect((await guest().get('/api/auth/unknown')).status).toBe(404);
  });
});
