// Test environment: loads .env, then points the local database at a separate
// test folder so automated tests never touch the data you use in `npm run dev`.
// When DATABASE_URL is set the tests use that database, but only ever create
// and delete accounts on the reserved @finora.test email domain.
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

if (!process.env.DATABASE_URL) process.env.PGLITE_DATA_DIR = 'db/.test-data';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'finora-test-only-secret-0123456789abcdef0123456789';
delete process.env.VERCEL;
process.env.NODE_ENV = 'test';
