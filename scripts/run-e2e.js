// npm run test:e2e
// 1. Prepares the test database (db/.test-data, or DATABASE_URL if set)
// 2. Starts a separate copy of FINORA on ports 5185 (site) and 3021 (api)
// 3. Runs the Playwright browser tests against it
// 4. Stops the app and deletes every test account and its data
// Extra arguments are passed to Playwright, e.g. `npm run test:e2e -- --headed`.

import { spawn } from 'node:child_process';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
if (!process.env.DATABASE_URL) process.env.PGLITE_DATA_DIR = 'db/.test-data';

const { closeDatabase, usingLocalDatabase, localDataDir } = await import('../api/_lib/db.js');
const { assertLocalDatabaseFree } = await import('./local-lock.js');
const { applySchemaAndSeed, deleteTestData, countTestData } = await import('../tests/setup/test-data.js');

const root = path.resolve(import.meta.dirname, '..');
const SITE_PORT = 5185;
const API_PORT = 3021;
const baseURL = `http://localhost:${SITE_PORT}`;

function startApp() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', 'dev.js')], {
      cwd: root,
      env: { ...process.env, API_PORT: String(API_PORT), VITE_PORT: String(SITE_PORT) },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    let output = '';
    const timer = setTimeout(() => reject(new Error(`App did not start in time:\n${output}`)), 60000);
    const onData = (chunk) => {
      output += chunk;
      if (output.includes('FINORA is running')) {
        clearTimeout(timer);
        resolve(child);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (c) => { output += c; });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`App exited early (code ${code}):\n${output}`));
    });
  });
}

function stopApp(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) return resolve();
    const timer = setTimeout(() => { child.kill(); resolve(); }, 15000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
    child.send('shutdown');
  });
}

function runPlaywright(args) {
  return new Promise((resolve) => {
    const cli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
    const p = spawn(process.execPath, [cli, 'test', ...args], {
      cwd: root,
      env: { ...process.env, E2E_BASE_URL: baseURL },
      stdio: 'inherit',
    });
    p.on('exit', (code) => resolve(code ?? 1));
  });
}

let app;
let exitCode = 1;
try {
  if (usingLocalDatabase()) assertLocalDatabaseFree();
  console.log(`[e2e] database: ${usingLocalDatabase() ? localDataDir() : 'DATABASE_URL'}`);
  await applySchemaAndSeed();
  await deleteTestData();
  await closeDatabase();

  app = await startApp();
  console.log(`[e2e] app running at ${baseURL}`);
  exitCode = await runPlaywright(process.argv.slice(2));
} catch (err) {
  console.error('[e2e]', err.message);
} finally {
  await stopApp(app);
  try {
    const removed = await deleteTestData();
    console.log('[e2e] cleaned up test data:', removed, '| remaining test rows:', await countTestData());
  } catch (err) {
    console.error('[e2e] cleanup failed:', err.message);
    exitCode = exitCode || 1;
  }
  await closeDatabase();
}
process.exit(exitCode);
