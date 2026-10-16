// The local PGlite database can only be opened by one process at a time.
// The dev server writes a lock file; db:setup refuses to run while it exists.

import fs from 'node:fs';
import path from 'node:path';

const LOCK_FILE = path.resolve(process.cwd(), 'db', '.local-dev.lock');

function isRunning(pid) {
  try { process.kill(pid, 0); return true; } catch (err) { return err.code === 'EPERM'; }
}

export function assertLocalDatabaseFree() {
  if (!fs.existsSync(LOCK_FILE)) return;
  const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
  if (pid && pid !== process.pid && isRunning(pid)) {
    console.error('\nThe app is running ("npm run dev") and is using the local database.');
    console.error('Stop it first (Ctrl+C in that terminal), then run this command again.\n');
    process.exit(1);
  }
  fs.rmSync(LOCK_FILE, { force: true });
}

export function acquireLocalDatabaseLock() {
  assertLocalDatabaseFree();
  fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
  fs.writeFileSync(LOCK_FILE, String(process.pid));
}

export function releaseLocalDatabaseLock() {
  try {
    if (Number(fs.readFileSync(LOCK_FILE, 'utf8')) === process.pid) fs.rmSync(LOCK_FILE, { force: true });
  } catch { /* already gone */ }
}
