import pg from 'pg';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

export async function seedTestUsers() {
  if (!connectionString) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Error: DATABASE_URL is not set.');
    console.log('Please add your Neon connection string to your .env file:');
    console.log('DATABASE_URL="postgresql://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require"');
    return false;
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('\x1b[36m%s\x1b[0m', '🌱 Seeding test users for authentication...');

    // Hash test password
    const hashedPassword = await bcryptjs.hash('SecurePass123!', 10);

    // 1. Create test ADMIN user
    console.log('Creating test admin user...');
    const adminResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role`,
      ['admin@finora.com', hashedPassword, 'admin', true]
    );

    if (adminResult.rows[0]) {
      console.log('\x1b[32m%s\x1b[0m', `✓ Admin user created: ${adminResult.rows[0].email}`);
    } else {
      console.log('Admin user already exists or conflict.');
    }

    // 2. Create test ADVISOR user
    console.log('Creating test advisor user...');
    const advisorResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role`,
      ['advisor@finora.com', hashedPassword, 'advisor', true]
    );

    if (advisorResult.rows[0]) {
      const advisorId = advisorResult.rows[0].id;
      console.log('\x1b[32m%s\x1b[0m', `✓ Advisor user created: ${advisorResult.rows[0].email}`);

      // Create advisor profile
      await pool.query(
        `INSERT INTO advisors (user_id, full_name, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO NOTHING`,
        [advisorId, 'Test Advisor', '+1-555-0123']
      );
    } else {
      console.log('Advisor user already exists or conflict.');
    }

    // 3. Create test CLIENT user
    console.log('Creating test client user...');
    const clientResult = await pool.query(
      `INSERT INTO users (email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, role`,
      ['client@finora.com', hashedPassword, 'client', true]
    );

    if (clientResult.rows[0]) {
      const clientId = clientResult.rows[0].id;
      console.log('\x1b[32m%s\x1b[0m', `✓ Client user created: ${clientResult.rows[0].email}`);

      // Create client profile
      const profileResult = await pool.query(
        `INSERT INTO client_profiles (user_id, first_name, last_name, country, occupation, income_range)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING id`,
        [clientId, 'Test', 'Client', 'United States', 'Professional', '100k-250k']
      );

      if (profileResult.rows[0]) {
        const profileId = profileResult.rows[0].id;
        console.log('\x1b[32m%s\x1b[0m', `✓ Client profile created`);

        // Assign advisor to client (if advisor exists)
        if (advisorResult.rows[0]) {
          const advisorId = advisorResult.rows[0].id;
          try {
            await pool.query(
              `INSERT INTO advisor_clients (advisor_id, client_id, relationship_status, assigned_date)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (advisor_id, client_id) DO NOTHING`,
              [advisorId, clientId, 'active']
            );
            console.log('\x1b[32m%s\x1b[0m', `✓ Advisor assigned to client`);
          } catch (e) {
            console.log('Advisor-client assignment already exists or failed.');
          }
        }

        // Add sample financial data
        console.log('Adding sample financial data...');

        // Savings
        await pool.query(
          `INSERT INTO client_savings (client_id, savings_account, money_market, cd_ladder)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (client_id) DO NOTHING`,
          [clientId, 25000, 15000, 10000]
        );

        // Income
        await pool.query(
          `INSERT INTO client_income (client_id, employment_income, investment_income, other_income, currency)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (client_id) DO NOTHING`,
          [clientId, 120000, 8000, 0, 'USD']
        );

        // Assets
        await pool.query(
          `INSERT INTO client_investments (client_id, stocks_value, bonds_value, real_estate_value, crypto_value)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (client_id) DO NOTHING`,
          [clientId, 150000, 80000, 350000, 5000]
        );

        // Liabilities
        await pool.query(
          `INSERT INTO client_liabilities (client_id, mortgage_balance, cc_balance, auto_loan_balance, student_loans_balance)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (client_id) DO NOTHING`,
          [clientId, 300000, 5000, 20000, 0]
        );

        // Cash Flow
        await pool.query(
          `INSERT INTO client_cashflow (client_id, monthly_income, monthly_expenses, emergency_fund_months, currency)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (client_id) DO NOTHING`,
          [clientId, 10000, 4500, 6, 'USD']
        );

        // Health Assessment (Financial Wellness Score)
        await pool.query(
          `INSERT INTO client_health_assessments (client_id, question_id, answer, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT DO NOTHING`,
          [clientId, 1, 'good']
        );

        // Sample Goals
        const goalsToAdd = [
          { type: 'Retirement', name: 'Comfortable Retirement by 65', target: 2000000, current: 450000, target_date: '2038-12-31' },
          { type: 'Education', name: 'Child College Fund', target: 200000, current: 35000, target_date: '2033-09-01' },
          { type: 'Home', name: 'Vacation Home', target: 400000, current: 50000, target_date: '2027-06-30' }
        ];

        for (const goal of goalsToAdd) {
          await pool.query(
            `INSERT INTO client_goals (client_id, goal_type, goal_name, target_amount, current_amount, target_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT DO NOTHING`,
            [clientId, goal.type, goal.name, goal.target, goal.current, goal.target_date, 'in_progress']
          );
        }

        console.log('\x1b[32m%s\x1b[0m', `✓ Sample financial data added`);
      }
    } else {
      console.log('Client user already exists or conflict.');
    }

    console.log('\x1b[32m%s\x1b[0m', '\n✓ Test data seeding complete!\n');
    console.log('TEST ACCOUNT CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    admin@finora.com');
    console.log('Password: SecurePass123!');
    console.log('Role:     ADMIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    advisor@finora.com');
    console.log('Password: SecurePass123!');
    console.log('Role:     ADVISOR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    client@finora.com');
    console.log('Password: SecurePass123!');
    console.log('Role:     CLIENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Seeding failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
seedTestUsers().then(success => {
  process.exit(success ? 0 : 1);
});
