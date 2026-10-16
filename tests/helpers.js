// Helpers for backend tests: an in-process API app and throwaway test users.
import { afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import { createApiApp } from '../scripts/api-app.js';
import { TEST_EMAIL_DOMAIN } from './setup/test-data.js';

export const app = createApiApp();

// One shared HTTP server per test file (closed when the file finishes).
const server = app.listen(0);
afterAll(() => new Promise((resolve) => server.close(resolve)));

export const PASSWORD = 'Test1234!';

export function testEmail(tag = 'user') {
  return `vitest.${tag}.${crypto.randomBytes(5).toString('hex')}@${TEST_EMAIL_DOMAIN}`;
}

// A cookie-keeping client that is not logged in.
export function guest() {
  return request.agent(server);
}

// Signs up a fresh test user and returns a logged-in client.
export async function newUser(tag = 'user', extra = {}) {
  const agent = request.agent(server);
  const email = testEmail(tag);
  const res = await agent.post('/api/auth/signup').send({ full_name: `Test ${tag}`, email, password: PASSWORD, ...extra });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, email, user: res.body.user };
}

export const STRONG_PROFILE = {
  monthly_income: '45000.00',
  monthly_expenses: '20000.00',
  monthly_debt_payments: '1500.00',
  emergency_fund: '150000.00',
  total_savings: '60000.00',
  total_investments: '600000.00',
  total_debt: '30000.00',
};

export function futureDate(years = 2) {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function pastDate(days = 30) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function goalPayload(overrides = {}) {
  return {
    name: 'Home deposit',
    category: 'Home',
    target_amount: '400000',
    current_amount: '100000',
    monthly_contribution: '10000',
    target_date: futureDate(3),
    ...overrides,
  };
}

export const RETIREMENT_PLAN = {
  current_age: 35,
  retirement_age: 60,
  current_savings: '200000',
  monthly_contribution: '5000',
  expected_return_pct: '6',
  desired_monthly_income: '20000',
  retirement_years: 25,
  inflation_pct: '2.5',
};

// Answers every question with the same option index.
export function uniformAnswers(questions, index) {
  return Object.fromEntries(questions.map((q) => [q.id, index]));
}
