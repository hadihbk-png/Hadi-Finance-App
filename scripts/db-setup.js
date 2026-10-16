// npm run db:setup
// Creates the tables (db/schema.sql) and loads sample data (db/seed.sql).
// Safe to run again: nothing is duplicated. Uses Neon when DATABASE_URL is set,
// otherwise the local PGlite database in db/.local-data.

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { executeScript, query, closeDatabase, usingLocalDatabase } from '../api/_lib/db.js';
import { assertLocalDatabaseFree } from './local-lock.js';

dotenv.config({ quiet: true });

const root = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, 'db', f), 'utf8');

const TABLES = [
  'users', 'financial_profiles', 'goals', 'risk_questions', 'risk_assessments', 'model_portfolios',
  'retirement_plans', 'saved_calculations', 'services', 'insights', 'consultation_requests',
];

async function main() {
  if (usingLocalDatabase()) {
    assertLocalDatabaseFree();
    console.log('Using the LOCAL development database (db/.local-data).');
  } else {
    console.log('Using the Neon database from DATABASE_URL.');
  }

  console.log('Creating tables (db/schema.sql)...');
  await executeScript(read('schema.sql'));
  console.log('Loading sample data (db/seed.sql)...');
  await executeScript(read('seed.sql'));

  console.log('\nRow counts:');
  const counts = [];
  for (const t of TABLES) {
    const [{ count }] = await query(`SELECT COUNT(*)::int AS count FROM ${t}`);
    counts.push({ table: t, rows: count });
  }
  console.table(counts);

  const bad = await query(`SELECT risk_profile FROM model_portfolios
    WHERE equities_pct + fixed_income_pct + sukuk_pct + gold_pct + real_estate_pct + cash_pct <> 100`);
  console.log(bad.length ? `WARNING: allocations not totalling 100%: ${bad.map((b) => b.risk_profile)}` : 'All model portfolio allocations add up to 100%.');
  console.log('\nDatabase is ready.');
}

main()
  .catch((err) => {
    console.error('\nDatabase setup failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
