// Every internal link and image must point at something that is actually deployed:
// a page listed in vite.config.js (the production build) or a file in public/.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const config = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');
const builtPages = [...config.matchAll(/page\('([^']+)'\)/g)].map((m) => m[1]);

const publicFiles = new Set();
(function walk(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(dir, entry.name), `${prefix}${entry.name}/`);
    else publicFiles.add(prefix + entry.name);
  }
})(path.join(root, 'public'));

describe('internal links', () => {
  it('builds every page into the production site', () => {
    for (const page of builtPages) expect(fs.existsSync(path.join(root, page)), page).toBe(true);
  });

  it.each(builtPages)('%s only links to pages and files that are deployed', (page) => {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const targets = [...html.matchAll(/(?:href|src)="\/([^"#?]*)/g)].map((m) => m[1]);
    const missing = targets.filter((t) => t && !t.startsWith('src/') && !builtPages.includes(t) && !publicFiles.has(t));
    expect(missing).toEqual([]);
  });

  it('scripts only link to deployed pages', () => {
    const missing = [];
    for (const file of fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js'))) {
      const js = fs.readFileSync(path.join(root, 'src', file), 'utf8');
      for (const m of js.matchAll(/['"`]\/([a-z0-9-]+\.html)/g)) {
        if (!builtPages.includes(m[1])) missing.push(`${file} -> ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
