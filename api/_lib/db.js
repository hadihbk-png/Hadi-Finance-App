// Database access for every /api route.
//
// - DATABASE_URL set (Vercel / Neon): uses @neondatabase/serverless over HTTPS.
// - DATABASE_URL empty (local development only): uses PGlite, a real Postgres
//   engine embedded in Node, storing its data in db/.local-data
//   (or PGLITE_DATA_DIR, which the automated tests point at db/.test-data).
//
// Routes only ever call query() / queryOne(), so the same code runs in both places.

import { neon } from '@neondatabase/serverless';
import path from 'node:path';

export function localDataDir() {
  return path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR || path.join('db', '.local-data'));
}

let runner = null;      // async (text, params) => rows
let localDb = null;     // PGlite instance, when used

export function usingLocalDatabase() {
  return !process.env.DATABASE_URL;
}

async function getRunner() {
  if (runner) return runner;

  const url = process.env.DATABASE_URL;
  if (url) {
    const sql = neon(url);
    runner = (text, params) => sql.query(text, params);
    return runner;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new DatabaseUnavailableError('DATABASE_URL is not configured on the server.');
  }

  // Module name kept in a variable so deployment bundlers never pull PGlite in.
  const pgliteModule = '@electric-sql/pglite';
  const { PGlite } = await import(pgliteModule);
  localDb = new PGlite(localDataDir());
  await localDb.waitReady;
  runner = async (text, params) => (await localDb.query(text, params)).rows;
  return runner;
}

export class DatabaseUnavailableError extends Error {
  constructor(message = 'The database could not be reached.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

const CONNECTION_ERROR = /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EAI_AGAIN|getaddrinfo|password authentication failed|Connection terminated|could not connect/i;

export async function query(text, params = []) {
  let run;
  try {
    run = await getRunner();
  } catch (err) {
    if (err instanceof DatabaseUnavailableError) throw err;
    throw new DatabaseUnavailableError(err.message);
  }
  try {
    return await run(text, params);
  } catch (err) {
    if (!err.code && CONNECTION_ERROR.test(String(err.message))) {
      throw new DatabaseUnavailableError(err.message);
    }
    throw err;
  }
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] || null;
}

// Runs a multi-statement SQL file (used by db:setup).
export async function executeScript(sqlText) {
  for (const statement of splitSqlStatements(sqlText)) {
    await query(statement);
  }
}

export async function closeDatabase() {
  if (localDb) {
    await localDb.close();
    localDb = null;
  }
  runner = null;
}

// Splits SQL on semicolons, ignoring ones inside quotes, $tag$ blocks and comments.
export function splitSqlStatements(sqlText) {
  const statements = [];
  let current = '';
  let i = 0;
  while (i < sqlText.length) {
    const ch = sqlText[i];
    const rest = sqlText.slice(i);

    if (rest.startsWith('--')) {
      const end = sqlText.indexOf('\n', i);
      i = end === -1 ? sqlText.length : end + 1;
      current += '\n';
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (j < sqlText.length) {
        if (sqlText[j] === "'" && sqlText[j + 1] === "'") { j += 2; continue; }
        if (sqlText[j] === "'") break;
        j++;
      }
      current += sqlText.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    const dollar = rest.match(/^\$[A-Za-z_]*\$/);
    if (dollar) {
      const tag = dollar[0];
      const end = sqlText.indexOf(tag, i + tag.length);
      const stop = end === -1 ? sqlText.length : end + tag.length;
      current += sqlText.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}
