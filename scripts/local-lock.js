// A local PGlite database can only be opened by one process at a time.
// The dev server writes a lock file next to its data folder; db:setup and the
// test runners refuse to open that folder while another live process holds it.

import fs from 'node:fs';
import { localDataDir } from '../api/_lib/db.js';

const lockFile = () => `${localDataDir()}.lock`;

function isRunning(pid) {
  try { process.kill(pid, 0); return true; } catch (err) { return err.code === 'EPERM'; }
}

export function assertLocalDatabaseFree() {
  const file = lockFile();
  if (!fs.existsSync(file)) return;
  const pid = Number(fs.readFileSync(file, 'utf8'));
  if (pid && pid !== process.pid && isRunning(pid)) {
    console.error(`\nThe local database (${localDataDir()}) is in use by a running app ("npm run dev").`);
    console.error('Stop it first (Ctrl+C in that terminal), then run this command again.\n');
    process.exit(1);
  }
  fs.rmSync(file, { force: true });
}

export function acquireLocalDatabaseLock() {
  assertLocalDatabaseFree();
  fs.writeFileSync(lockFile(), String(process.pid));
}

export function releaseLocalDatabaseLock() {
  try {
    if (Number(fs.readFileSync(lockFile(), 'utf8')) === process.pid) fs.rmSync(lockFile(), { force: true });
  } catch { /* already gone */ }
}
