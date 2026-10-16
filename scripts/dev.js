// npm run dev
// Starts the /api functions (a small Express server that loads the exact same
// api/*.js files Vercel deploys) and the Vite frontend, which proxies /api to it.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { query, closeDatabase, usingLocalDatabase } from '../api/_lib/db.js';
import { acquireLocalDatabaseLock, releaseLocalDatabaseLock } from './local-lock.js';

const root = path.resolve(import.meta.dirname, '..');
const apiDir = path.join(root, 'api');
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
process.env.API_PORT = String(API_PORT);

// ---------------------------------------------------------------------------
// Vercel-style routing for /api
// ---------------------------------------------------------------------------
const rewrites = (() => {
  const file = path.join(root, 'vercel.json');
  if (!fs.existsSync(file)) return [];
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (config.rewrites || []).map(({ source, destination }) => {
    const names = [];
    const pattern = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:(\w+)/g, (_, n) => { names.push(n); return '([^/]+)'; });
    return { regex: new RegExp(`^${pattern}/?$`), names, destination };
  });
})();

function applyRewrites(pathname) {
  for (const r of rewrites) {
    const m = pathname.match(r.regex);
    if (!m) continue;
    let dest = r.destination;
    r.names.forEach((n, i) => { dest = dest.replaceAll(`:${n}`, encodeURIComponent(decodeURIComponent(m[i + 1]))); });
    const url = new URL(dest, 'http://localhost');
    return { pathname: url.pathname, query: Object.fromEntries(url.searchParams) };
  }
  return { pathname, query: {} };
}

const isPublic = (name) => !name.startsWith('_') && !name.startsWith('.');
const dynamicEntry = (dir, wantFile) => {
  if (!fs.existsSync(dir)) return null;
  const hit = fs.readdirSync(dir, { withFileTypes: true })
    .find((e) => /^\[\w+\](\.js)?$/.test(e.name) && (wantFile ? e.isFile() && e.name.endsWith('.js') : e.isDirectory()));
  return hit ? { name: hit.name, param: hit.name.replace(/\.js$/, '').slice(1, -1) } : null;
};

// Maps /api/a/b to api/a/b.js, api/a/b/index.js or a [param].js file, like Vercel does.
function resolveRoute(pathname) {
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (segments.some((s) => s === '..' || s.includes('\\') || !isPublic(s))) return null;
  let dir = apiDir;
  const params = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (i === segments.length - 1) {
      const file = path.join(dir, `${seg}.js`);
      if (fs.existsSync(file)) return { file, params };
      const index = path.join(dir, seg, 'index.js');
      if (fs.existsSync(index)) return { file: index, params };
      const dyn = dynamicEntry(dir, true);
      if (dyn) return { file: path.join(dir, dyn.name), params: { ...params, [dyn.param]: seg } };
      return null;
    }
    if (fs.existsSync(path.join(dir, seg)) && fs.statSync(path.join(dir, seg)).isDirectory()) {
      dir = path.join(dir, seg);
      continue;
    }
    const dyn = dynamicEntry(dir, false);
    if (!dyn) return null;
    params[dyn.param] = seg;
    dir = path.join(dir, dyn.name);
  }
  const index = path.join(dir, 'index.js');
  return fs.existsSync(index) ? { file: index, params } : null;
}

// Route files are re-imported when they change, so edits apply without a restart.
async function loadHandler(file) {
  const version = fs.statSync(file).mtimeMs;
  const mod = await import(`${pathToFileURL(file).href}?v=${version}`);
  return mod.default;
}

const app = express();
app.disable('x-powered-by');
app.use('/api', express.json({ limit: '100kb' }));

app.use('/api', async (req, res) => {
  const url = new URL(req.originalUrl, 'http://localhost');
  const rewritten = applyRewrites(url.pathname);
  const target = resolveRoute(rewritten.pathname);
  if (!target) return res.status(404).json({ error: 'Not found.' });

  const queryParams = { ...Object.fromEntries(url.searchParams), ...rewritten.query, ...target.params };
  Object.defineProperty(req, 'query', { value: queryParams, writable: true, configurable: true });

  const started = Date.now();
  res.on('finish', () => {
    console.log(`  ${req.method.padEnd(6)} ${url.pathname}${url.search} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });

  try {
    const handler = await loadHandler(target.file);
    await handler(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  }
});

// Malformed JSON bodies
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
  next(err);
});

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
    const s = app.listen(API_PORT, () => resolve(s));
    s.on('error', reject);
  });

  await checkDatabase();

  const vite = await createViteServer({ root, configFile: path.join(root, 'vite.config.js') });
  await vite.listen();

  const local = vite.resolvedUrls?.local?.[0] || `http://localhost:${vite.config.server.port}/`;
  console.log('\n  FINORA is running');
  console.log(`  Open:      ${local}`);
  console.log(`  API:       http://localhost:${API_PORT}/api  (proxied through the address above)`);
  console.log(`  Database:  ${usingLocalDatabase() ? 'local (db/.local-data)' : 'Neon (DATABASE_URL)'}`);
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
}

main().catch(async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${API_PORT} is already in use. Set API_PORT in .env to a free port and try again.\n`);
  } else {
    console.error(err);
  }
  await closeDatabase().catch(() => {});
  releaseLocalDatabaseLock();
  process.exit(1);
});
