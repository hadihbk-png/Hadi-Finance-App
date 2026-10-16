// Runs once before all backend tests (and once after them).
import './env.js';
import { closeDatabase, usingLocalDatabase, localDataDir } from '../../api/_lib/db.js';
import { assertLocalDatabaseFree } from '../../scripts/local-lock.js';
import { applySchemaAndSeed, deleteTestData, countTestData } from './test-data.js';

export async function setup() {
  if (usingLocalDatabase()) assertLocalDatabaseFree();
  console.log(`\n[tests] database: ${usingLocalDatabase() ? localDataDir() : 'DATABASE_URL'}`);
  await applySchemaAndSeed();
  const leftovers = await deleteTestData();
  if (leftovers.users || leftovers.consultations) console.log('[tests] removed leftovers from an earlier run:', leftovers);
  await closeDatabase();
}

export async function teardown() {
  const removed = await deleteTestData();
  const remaining = await countTestData();
  console.log('[tests] cleaned up test data:', removed, '| remaining test rows:', remaining);
  await closeDatabase();
}
