// Express app that serves the api/*.js functions the same way Vercel does
// (file-based routes, [param] segments and the rewrites in vercel.json).
// Used by `npm run dev` and by the backend tests.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const root = path.resolve(import.meta.dirname, '..');
const apiDir = path.join(root, 'api');

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
  let segments;
  try {
    segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
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

export function createApiApp({ logRequests = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Parse bodies the way Vercel does: JSON, form posts and plain text.
  app.use('/api', express.json({ limit: '100kb' }), express.urlencoded({ extended: false, limit: '100kb' }), express.text({ type: 'text/*', limit: '100kb' }));

  app.use('/api', async (req, res) => {
    const url = new URL(req.originalUrl, 'http://localhost');
    const rewritten = applyRewrites(url.pathname);
    const target = resolveRoute(rewritten.pathname);
    if (!target) return res.status(404).json({ error: 'Not found.' });

    const queryParams = { ...Object.fromEntries(url.searchParams), ...rewritten.query, ...target.params };
    Object.defineProperty(req, 'query', { value: queryParams, writable: true, configurable: true });

    if (logRequests) {
      const started = Date.now();
      res.on('finish', () => {
        console.log(`  ${req.method.padEnd(6)} ${url.pathname}${url.search} -> ${res.statusCode} (${Date.now() - started}ms)`);
      });
    }

    try {
      const handler = await loadHandler(target.file);
      await handler(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
    }
  });

  // Malformed or oversized JSON bodies
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
    next(err);
  });

  return app;
}
