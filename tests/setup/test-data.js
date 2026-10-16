// Shared helpers for preparing and cleaning the test database.
import fs from 'node:fs';
import path from 'node:path';
import { executeScript, query } from '../../api/_lib/db.js';

export const TEST_EMAIL_DOMAIN = 'finora.test';

const root = path.resolve(import.meta.dirname, '..', '..');

export async function applySchemaAndSeed() {
  for (const file of ['schema.sql', 'seed.sql']) {
    await executeScript(fs.readFileSync(path.join(root, 'db', file), 'utf8'));
  }
}

// Removes every row created by tests. Deleting the users cascades to their
// profiles, goals, risk assessments, retirement plans and saved calculations.
export async function deleteTestData() {
  const like = `%@${TEST_EMAIL_DOMAIN}`;
  const consultations = await query(
    `DELETE FROM consultation_requests
     WHERE email LIKE $1 OR user_id IN (SELECT id FROM users WHERE email LIKE $1)
     RETURNING id`, [like]);
  const users = await query('DELETE FROM users WHERE email LIKE $1 RETURNING id', [like]);
  return { users: users.length, consultations: consultations.length };
}

export async function countTestData() {
  const like = `%@${TEST_EMAIL_DOMAIN}`;
  const [row] = await query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE email LIKE $1)::int AS users,
      (SELECT COUNT(*) FROM financial_profiles p JOIN users u ON u.id = p.user_id WHERE u.email LIKE $1)::int AS profiles,
      (SELECT COUNT(*) FROM goals g JOIN users u ON u.id = g.user_id WHERE u.email LIKE $1)::int AS goals,
      (SELECT COUNT(*) FROM consultation_requests WHERE email LIKE $1)::int AS consultations
  `, [like]);
  return row;
}
