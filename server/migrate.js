import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

export async function runMigrations() {
  if (!connectionString) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Error: DATABASE_URL is not set.');
    console.log('Please add your Neon connection string to your .env file:');
    console.log('DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"');
    return false;
  }

  console.log('\x1b[36m%s\x1b[0m', 'Connecting to Neon PostgreSQL to apply migrations...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    console.log('\x1b[32m%s\x1b[0m', '✓ Schema migrations successfully applied to Neon PostgreSQL.');
    console.log('Created tables:');
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    res.rows.forEach(r => console.log(`  - ${r.table_name}`));
    return true;
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Migration failed:', err.message);
    return false;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
}
