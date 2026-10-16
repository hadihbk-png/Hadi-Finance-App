import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Neon PostgreSQL connection string should be provided in DATABASE_URL
const connectionString = process.env.DATABASE_URL;

let pool = null;

if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected Neon PostgreSQL client error:', err.message);
  });
} else {
  console.log('\x1b[33m%s\x1b[0m', 'ℹ [FINORA DB] DATABASE_URL environment variable is not defined.');
  console.log('\x1b[36m%s\x1b[0m', '  Add your Neon connection string in .env: DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"');
  console.log('\x1b[32m%s\x1b[0m', '  The platform is currently operating in local storage mode with full interactive capabilities.');
}

export const query = async (text, params) => {
  if (!pool) {
    return { rows: [], rowCount: 0 };
  }
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`Executed query (${duration}ms):`, text.slice(0, 80));
    }
    return res;
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err;
  }
};

export const isDbConnected = async () => {
  if (!pool) return false;
  try {
    const res = await pool.query('SELECT 1 as connected');
    return res.rows[0]?.connected === 1;
  } catch {
    return false;
  }
};

export default { query, isDbConnected, pool };
