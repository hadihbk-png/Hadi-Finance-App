// npm run dev
// Starts the /api functions (a small Express server that loads the exact same
// api/*.js files Vercel deploys) and the Vite frontend, which proxies /api to it.
//
// Optional environment overrides: API_PORT (default 3011), VITE_PORT (default 5175),
// PGLITE_DATA_DIR (local database folder, default db/.local-data).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { query, closeDatabase, usingLocalDatabase, localDataDir } from '../api/_lib/db.js';
import { acquireLocalDatabaseLock, releaseLocalDatabaseLock } from './local-lock.js';
import { createApiApp } from './api-app.js';

const root = path.resolve(import.meta.dirname, '..');
const envFile = path.join(root, '.env');

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
dotenv.config({ path: envFile, quiet: true });

if (!process.env.JWT_SECRET) {
  const secret = crypto.randomBytes(48).toString('hex');
  const existing = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  const cleaned = existing.split(/\r?\n/).filter((l) => !/^JWT_SECRET=/.test(l)).join('\n').replace(/\n*$/, '\n');
  fs.writeFileSync(envFile, `${cleaned}JWT_SECRET=${secret}\n`);
  process.env.JWT_SECRET = secret;
  console.log('Generated a new JWT_SECRET and saved it to .env');
}

const API_PORT = Number(process.env.API_PORT || 3011);
process.env.API_PORT = String(API_PORT); // read by vite.config.js for the /api proxy

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function checkDatabase() {
  try {
    const [row] = await query("SELECT to_regclass('public.users') IS NOT NULL AS ready");
    if (!row.ready) {
      console.warn('\n  The database has no tables yet. Stop the app and run:  npm run db:setup\n');
    }
  } catch (err) {
    console.warn(`\n  Could not reach the database: ${err.message}\n`);
  }
}

async function main() {
  if (usingLocalDatabase()) acquireLocalDatabaseLock();

  const apiServer = await new Promise((resolve, reject) => {
    const s = createApiApp({ logRequests: true }).listen(API_PORT, () => resolve(s));
    s.on('error', reject);
  });

  await checkDatabase();

  const vite = await createViteServer({
    root,
    configFile: path.join(root, 'vite.config.js'),
    ...(process.env.VITE_PORT ? { server: { port: Number(process.env.VITE_PORT), strictPort: true } } : {}),
  });
  await vite.listen();

  const local = vite.resolvedUrls?.local?.[0] || `http://localhost:${vite.config.server.port}/`;
  console.log('\n  FINORA is running');
  console.log(`  Open:      ${local}`);
  console.log(`  API:       http://localhost:${API_PORT}/api  (proxied through the address above)`);
  console.log(`  Database:  ${usingLocalDatabase() ? `local (${path.relative(root, localDataDir())})` : 'Neon (DATABASE_URL)'}`);
  console.log('  Press Ctrl+C to stop.\n');

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log('\nStopping FINORA...');
    await vite.close().catch(() => {});
    await new Promise((r) => apiServer.close(() => r()));
    await closeDatabase().catch(() => {});
    releaseLocalDatabaseLock();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGBREAK', shutdown);
  // The browser-test runner asks for a clean shutdown over IPC (Windows has no SIGINT for child processes).
  process.on('message', (msg) => { if (msg === 'shutdown') shutdown(); });
}

main().catch(async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${err.port || API_PORT} is already in use. Set API_PORT / VITE_PORT in .env to a free port and try again.\n`);
  } else {
    console.error(err);
  }
  await closeDatabase().catch(() => {});
  releaseLocalDatabaseLock();
  process.exit(1);
});
