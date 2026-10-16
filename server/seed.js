import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

export async function seedDatabase() {
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
    console.log('\x1b[36m%s\x1b[0m', '🌱 Starting Neon PostgreSQL database seed with realistic sample data...');

    // 1. Seed 3 Advisors
    console.log('Seeding 3 Senior Advisors...');
    const advisorsData = [
      {
        full_name: 'Eleanor Vance, CFP®, CPWA®',
        email: 'eleanor.vance@finora-advisory.com',
        phone: '+1 (212) 555-0142',
        title: 'Senior Managing Director, Family Wealth',
        bio: 'Over 22 years structuring multi-generational family office trusts, estate transfers, and tax-efficient wealth preservation.',
        specialties: ['Estate Architecture', 'Generational Trusts', 'Family Governance', 'Tax-Location Strategy'],
        photo_url: '/images/advisors/eleanor.jpg'
      },
      {
        full_name: 'Julian Montgomery, CFA®',
        email: 'julian.montgomery@finora-advisory.com',
        phone: '+44 20 7946 0193',
        title: 'Chief Investment Strategist',
        bio: 'Former institutional asset manager directing strategic asset allocation, volatility risk hedging, and endowment-style diversification.',
        specialties: ['Asset Allocation', 'Market Volatility Hedging', 'Alternative Investments', 'Endowment Models'],
        photo_url: '/images/advisors/julian.jpg'
      },
      {
        full_name: 'Dr. Beatrice Sterling, PhD, CFP®',
        email: 'beatrice.sterling@finora-advisory.com',
        phone: '+41 22 819 0184',
        title: 'Head of Retirement & Longevity Advisory',
        bio: 'Specialist in quantitative longevity risk modeling, safe withdrawal horizons, and dynamic decumulation frameworks.',
        specialties: ['Retirement Modeling', 'Longevity Risk', 'Safe Withdrawal Architecture', 'Executive Compensation'],
        photo_url: '/images/advisors/beatrice.jpg'
      }
    ];

    const advisorIds = [];
    for (const adv of advisorsData) {
      const res = await pool.query(`
        INSERT INTO advisors (full_name, email, phone, title, bio, specialties, photo_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id;
      `, [adv.full_name, adv.email, adv.phone, adv.title, adv.bio, adv.specialties, adv.photo_url]);
      advisorIds.push(res.rows[0].id);
    }

    // 2. Seed 20 Sample Clients
    console.log('Seeding 20 Realistic Sample Clients...');
    const sampleClientsData = [
      { first: 'Alexander', last: 'Wright', code: 'FIN-1001', country: 'United States', stage: 'Peak Earning Years', emp: 'Employed Executive', inc: 340000, nw: 2450000 },
      { first: 'Sophia', last: 'Chen', code: 'FIN-1002', country: 'Singapore', stage: 'Growing Family', emp: 'Tech Founder', inc: 420000, nw: 3800000 },
      { first: 'Marcus', last: 'Kaufmann', code: 'FIN-1003', country: 'Switzerland', stage: 'Pre-Retiree', emp: 'Private Consultant', inc: 280000, nw: 4100000 },
      { first: 'Olivia', last: 'Harrison', code: 'FIN-1004', country: 'United Kingdom', stage: 'Growing Family', emp: 'Partner, Legal Firm', inc: 390000, nw: 2900000 },
      { first: 'David', last: 'Sterling', code: 'FIN-1005', country: 'United States', stage: 'Emerging Professional', emp: 'Software Architect', inc: 195000, nw: 780000 },
      { first: 'Elena', last: 'Rostova', code: 'FIN-1006', country: 'United Arab Emirates', stage: 'Peak Earning Years', emp: 'Business Owner', inc: 510000, nw: 5600000 },
      { first: 'Lucas', last: 'Moretti', code: 'FIN-1007', country: 'Italy', stage: 'Growing Family', emp: 'Design Director', inc: 180000, nw: 1150000 },
      { first: 'Claire', last: 'Beaumont', code: 'FIN-1008', country: 'France', stage: 'Pre-Retiree', emp: 'Senior Surgeon', inc: 360000, nw: 3400000 },
      { first: 'James', last: 'O\'Connor', code: 'FIN-1009', country: 'Ireland', stage: 'Peak Earning Years', emp: 'Finance Director', inc: 290000, nw: 2100000 },
      { first: 'Mei-Ling', last: 'Tan', code: 'FIN-1010', country: 'Singapore', stage: 'Emerging Professional', emp: 'Biotech Scientist', inc: 165000, nw: 620000 },
      { first: 'Henrik', last: 'Lindqvist', code: 'FIN-1011', country: 'Sweden', stage: 'Pre-Retiree', emp: 'Engineering Executive', inc: 240000, nw: 2850000 },
      { first: 'Isabella', last: 'Santos', code: 'FIN-1012', country: 'United States', stage: 'Growing Family', emp: 'Physician Specialist', inc: 320000, nw: 1950000 },
      { first: 'Tariq', last: 'Al-Mansoor', code: 'FIN-1013', country: 'United Arab Emirates', stage: 'Peak Earning Years', emp: 'Commercial Developer', inc: 650000, nw: 7200000 },
      { first: 'Charlotte', last: 'Davies', code: 'FIN-1014', country: 'United Kingdom', stage: 'Emerging Professional', emp: 'Management Consultant', inc: 175000, nw: 710000 },
      { first: 'Vikram', last: 'Patel', code: 'FIN-1015', country: 'United States', stage: 'Growing Family', emp: 'Chief Technology Officer', inc: 480000, nw: 4600000 },
      { first: 'Astrid', last: 'Nygård', code: 'FIN-1016', country: 'Norway', stage: 'Pre-Retiree', emp: 'Architectural Principal', inc: 260000, nw: 3100000 },
      { first: 'Gabriel', last: 'Silva', code: 'FIN-1017', country: 'Portugal', stage: 'Emerging Professional', emp: 'Fintech Product Lead', inc: 155000, nw: 540000 },
      { first: 'Hannah', last: 'Zimmermann', code: 'FIN-1018', country: 'Germany', stage: 'Growing Family', emp: 'Patent Attorney', inc: 310000, nw: 2300000 },
      { first: 'Nathaniel', last: 'Drake', code: 'FIN-1019', country: 'United States', stage: 'Peak Earning Years', emp: 'Asset Manager', inc: 550000, nw: 6100000 },
      { first: 'Victoria', last: 'Sinclair', code: 'FIN-1020', country: 'Canada', stage: 'Pre-Retiree', emp: 'Media Group Founder', inc: 380000, nw: 4800000 }
    ];

    const clientIds = [];
    for (let i = 0; i < sampleClientsData.length; i++) {
      const c = sampleClientsData[i];
      const assignedAdvisor = advisorIds[i % advisorIds.length];
      const email = `${c.first.toLowerCase()}.${c.last.toLowerCase().replace("'", "")}@sample-client.finora.com`;
      const res = await pool.query(`
        INSERT INTO client_profiles (
          advisor_id, client_code, first_name, last_name, email, phone, 
          country, employment_status, household_stage, annual_income, net_worth_estimate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (client_code) DO UPDATE SET annual_income = EXCLUDED.annual_income
        RETURNING id;
      `, [assignedAdvisor, c.code, c.first, c.last, email, `+1 555-01${10 + i}`, c.country, c.emp, c.stage, c.inc, c.nw]);
      clientIds.push(res.rows[0].id);
    }

    // 3. Seed 20 Financial Health Assessments
    console.log('Seeding 20 Financial Health Assessments...');
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const overall = 68 + (i % 25);
      const cashflow = 70 + (i % 24);
      const savings = 65 + (i % 28);
      const emergency = 72 + (i % 25);
      const debt = 60 + (i % 35);
      const investments = 65 + (i % 30);
      const retirement = 62 + (i % 32);
      const protection = 75 + (i % 20);

      const answers = {
        ageRange: i < 5 ? '35-44' : (i < 12 ? '45-54' : '55-64'),
        monthlySavings: Math.round(sampleClientsData[i].inc * 0.03),
        emergencyMonths: 6 + (i % 6),
        debtLoadRatio: 'Healthy (<25%)',
        insuranceProtected: true
      };

      await pool.query(`
        INSERT INTO financial_assessments (
          client_id, overall_score, cashflow_score, savings_score, emergency_score,
          debt_score, investments_score, retirement_score, protection_score, answers_json, advisor_observations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
      `, [
        clientId, overall, cashflow, savings, emergency, debt, investments, retirement, protection,
        JSON.stringify(answers),
        'Capital structure demonstrates strong organic cash generation. Focus on maximizing non-taxable asset location and trust shielding.'
      ]);
    }

    // 4. Seed 20 Risk Assessments & Investment Profiles
    console.log('Seeding 20 Risk Assessments & Profiles...');
    const riskProfiles = ['Conservative', 'Moderately Conservative', 'Balanced', 'Growth', 'Aggressive'];
    const allocations = {
      'Conservative': [15, 60, 10, 15],
      'Moderately Conservative': [30, 45, 15, 10],
      'Balanced': [50, 35, 10, 5],
      'Growth': [70, 20, 7, 3],
      'Aggressive': [85, 10, 5, 0]
    };

    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const profile = riskProfiles[i % riskProfiles.length];
      const score = 35 + (i * 3);
      const alloc = allocations[profile];

      await pool.query(`
        INSERT INTO risk_assessments (
          client_id, risk_score, risk_profile, timeframe_score, loss_tolerance_score, capacity_score, answers_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [clientId, score, profile, 75, 65, 80, JSON.stringify({ experience: 'Experienced', lossReaction: 'Patient & Disciplined' })]);

      await pool.query(`
        INSERT INTO investment_profiles (
          client_id, risk_profile, target_equity_pct, target_fixed_income_pct, target_alternatives_pct, target_cash_pct, time_horizon_years
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [clientId, profile, alloc[0], alloc[1], alloc[2], alloc[3], 12]);
    }

    // 5. Seed 40 Financial Goals (2 goals per client)
    console.log('Seeding 40 Financial Goals...');
    const goalArchetypes = [
      { type: 'Retirement', name: 'Primary Retirement Nest Egg', target: 3500000, current: 1250000, years: 14, contrib: 4500 },
      { type: 'Home Purchase', name: 'Coastal Estate Acquisition', target: 850000, current: 320000, years: 4, contrib: 8000 },
      { type: 'Education', name: 'Oxford / Ivy League Tuition Fund', target: 450000, current: 180000, years: 7, contrib: 2800 },
      { type: 'Emergency Fund', name: '12-Month Liquidity Reserve', target: 150000, current: 110000, years: 2, contrib: 1500 },
      { type: 'Travel', name: 'Family Sabbatical & European Grand Tour', target: 75000, current: 40000, years: 3, contrib: 1000 },
      { type: 'Investment', name: 'Private Equity Co-Investment Allocation', target: 500000, current: 220000, years: 5, contrib: 4000 },
      { type: 'Major Purchase', name: 'Solar & Sustainable Estate Upgrade', target: 95000, current: 65000, years: 2, contrib: 1200 },
      { type: 'Wedding', name: 'Daughter\'s Wedding & Celebration', target: 80000, current: 45000, years: 3, contrib: 900 }
    ];

    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const g1 = goalArchetypes[(i * 2) % goalArchetypes.length];
      const g2 = goalArchetypes[(i * 2 + 1) % goalArchetypes.length];

      const targetDate1 = new Date();
      targetDate1.setFullYear(targetDate1.getFullYear() + g1.years);

      const targetDate2 = new Date();
      targetDate2.setFullYear(targetDate2.getFullYear() + g2.years);

      await pool.query(`
        INSERT INTO financial_goals (client_id, goal_type, goal_name, target_amount, current_savings, target_date, monthly_contribution, priority, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `, [clientId, g1.type, g1.name, g1.target, g1.current, targetDate1, g1.contrib, 'High', 'In Progress']);

      await pool.query(`
        INSERT INTO financial_goals (client_id, goal_type, goal_name, target_amount, current_savings, target_date, monthly_contribution, priority, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
      `, [clientId, g2.type, g2.name, g2.target, g2.current, targetDate2, g2.contrib, 'Medium', 'In Progress']);
    }

    // 6. Seed Sample Assets & Liabilities (for each client)
    console.log('Seeding Sample Assets and Liabilities...');
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const client = sampleClientsData[i];

      // Assets
      await pool.query(`
        INSERT INTO assets (client_id, asset_type, asset_name, current_value, institution)
        VALUES 
          ($1, 'Cash & Reserves', 'High-Yield Liquid Treasury Sweep', $2, 'JPMorgan Chase'),
          ($1, 'Taxable Brokerage', 'Global All-Cap Core Portfolio', $3, 'Fidelity Custody'),
          ($1, 'Real Estate', 'Primary Family Residence', $4, 'Direct Ownership');
      `, [clientId, client.nw * 0.12, client.nw * 0.48, client.nw * 0.40]);

      // Liabilities
      await pool.query(`
        INSERT INTO liabilities (client_id, liability_type, creditor_name, balance, interest_rate, monthly_payment)
        VALUES 
          ($1, 'Mortgage', 'First National Residential Mortgage', $2, 3.25, $3);
      `, [clientId, client.nw * 0.22, Math.round(client.inc * 0.16)]);
    }

    // 7. Seed Sample Retirement Plans
    console.log('Seeding Sample Retirement Plans...');
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i];
      const client = sampleClientsData[i];
      const currentAge = 35 + (i * 2);
      const targetRetirementAge = 65;
      const currentSavings = client.nw * 0.45;
      const monthlyContrib = Math.round(client.inc * 0.025);
      const desiredIncome = client.inc * 0.70;

      await pool.query(`
        INSERT INTO retirement_plans (
          client_id, current_age, target_retirement_age, current_savings, monthly_contribution,
          expected_return_pct, inflation_pct, desired_annual_income, expected_retirement_duration,
          projected_fund, required_fund, funding_gap, suggested_monthly_contrib, readiness_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
      `, [
        clientId, currentAge, targetRetirementAge, currentSavings, monthlyContrib,
        6.2, 2.5, desiredIncome, 30,
        currentSavings * 3.4, desiredIncome * 22, 0, monthlyContrib, 'On Track & Well Funded'
      ]);
    }

    // 8. Seed Sample Consultation Requests
    console.log('Seeding Sample Consultation Requests...');
    const consultationsData = [
      { name: 'Arthur Pendelton', email: 'arthur.p@outlook.com', phone: '+1 555-0819', country: 'United States', method: 'Video Call', area: 'Retirement & Capital Longevity', msg: 'Planning retirement transition within 3 years; seeking safe withdrawal modeling.' },
      { name: 'Dr. Evelyn Martinez', email: 'emartinez@health-clinic.org', phone: '+1 555-0842', country: 'United States', method: 'In-Person Salon', area: 'Comprehensive Financial Review', msg: 'Sold medical practice shares; require structured family office guidance.' },
      { name: 'Gilles Delacroix', email: 'gilles.delacroix@geneva-capital.ch', phone: '+41 22 700 1234', country: 'Switzerland', method: 'Email', area: 'Generational Wealth & Estate', msg: 'Interested in cross-border trust structuring for second generation.' },
      { name: 'Sunita Ramanathan', email: 's.ramanathan@techcorp.sg', phone: '+65 6789 0123', country: 'Singapore', method: 'Video Call', area: 'Asset Allocation & Risk Modeling', msg: 'Concentrated tech equity position needing diversified non-correlated hedging.' }
    ];

    for (const consult of consultationsData) {
      await pool.query(`
        INSERT INTO advisor_consultation_requests (
          full_name, email, phone, country, preferred_contact_method, area_of_interest, preferred_date, message, status
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE + INTERVAL '5 days', $7, 'Pending');
      `, [consult.name, consult.email, consult.phone, consult.country, consult.method, consult.area, consult.msg]);
    }

    console.log('\x1b[32m%s\x1b[0m', '✓ Sample database seed completed successfully!');
    console.log('Summary of seeded records:');
    console.log('  - 3 Senior Advisors');
    console.log('  - 20 Sample Clients (Realistic non-real profiles)');
    console.log('  - 20 Financial Health Assessments');
    console.log('  - 20 Risk Profiles & Allocation Models');
    console.log('  - 40 Financial Goals with target dates and funding tracks');
    console.log('  - 60 Sample Asset records');
    console.log('  - 20 Sample Liabilities');
    console.log('  - 20 Retirement Plans');
    console.log('  - 4 Consultation Inquiries');
    return true;
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '✗ Seeding failed:', err.message);
    return false;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase();
}
