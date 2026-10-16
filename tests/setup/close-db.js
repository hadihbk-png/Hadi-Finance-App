// Each test file opens the database through the API routes; release it afterwards
// so the next file (and the global teardown) can open it again.
import { afterAll } from 'vitest';
import { closeDatabase } from '../../api/_lib/db.js';

afterAll(async () => {
  await closeDatabase();
});
