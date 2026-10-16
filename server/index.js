import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import session from 'express-session';
import ConnectPgSimple from 'connect-pg-simple';
import { fileURLToPath } from 'url';
import db from './db.js';
import { sanitizeInput, errorHandler } from './middleware.js';

// Route imports
import authRouter from './routes/auth.js';
import clientRouter from './routes/client.js';
import advisorRouter from './routes/advisor.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet for secure HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://192.168.1.123:5176'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================

const pgSession = ConnectPgSimple(session);

// Create session store
let sessionStore;
try {
  sessionStore = new pgSession({
    pool: db.pool || {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'finora',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || ''
    },
    tableName: 'session',
    createTableIfMissing: true
  });
} catch (error) {
  console.log('Session store initialization (using memory fallback)');
  sessionStore = null;
}

// Session middleware
app.use(session({
  store: sessionStore || new session.MemoryStore(),
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable MUST be set in production');
    }
    return 'development-secret-not-for-production';
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Input sanitization
app.use(sanitizeInput);

// Serve static assets from project root & dist
app.use(express.static(rootDir));
app.use('/public', express.static(path.join(rootDir, 'public')));

// In-memory fallback stores for local offline development
const localStore = {
  healthAssessments: [],
  riskAssessments: [],
  goals: [
    {
      id: 'local-1',
      goal_type: 'Home Purchase',
      goal_name: 'Primary Family Residence',
      target_amount: 750000,
      current_savings: 320000,
      target_date: '2028-12-31',
      monthly_contribution: 6500,
      priority: 'High',
      status: 'In Progress'
    },
    {
      id: 'local-2',
      goal_type: 'Retirement',
      goal_name: 'Core Nest Egg Accumulation',
      target_amount: 3200000,
      current_savings: 1100000,
      target_date: '2039-06-30',
      monthly_contribution: 4200,
      priority: 'High',
      status: 'In Progress'
    },
    {
      id: 'local-3',
      goal_type: 'Education',
      goal_name: 'University Tuition Trust',
      target_amount: 350000,
      current_savings: 140000,
      target_date: '2032-09-01',
      monthly_contribution: 2100,
      priority: 'Medium',
      status: 'In Progress'
    },
    {
      id: 'local-4',
      goal_type: 'Emergency Fund',
      goal_name: '12-Month Liquidity Buffer',
      target_amount: 120000,
      current_savings: 95000,
      target_date: '2027-06-01',
      monthly_contribution: 1500,
      priority: 'High',
      status: 'In Progress'
    }
  ],
  consultations: []
};

// ============================================================================
// API ROUTES
// ============================================================================

// 1. Health & Database Connection Status Check
app.get('/api/db/status', async (req, res) => {
  const isConnected = await db.isDbConnected();
  let tableCounts = {};

  if (isConnected) {
    try {
      const tables = ['client_profiles', 'advisors', 'financial_goals', 'financial_assessments', 'risk_assessments'];
      for (const t of tables) {
        const countRes = await db.query(`SELECT COUNT(*) as count FROM ${t}`);
        tableCounts[t] = parseInt(countRes.rows[0].count, 10);
      }
    } catch (e) {
      console.error('Error fetching table counts:', e.message);
    }
  }

  res.json({
    database: 'Neon PostgreSQL',
    connected: isConnected,
    mode: isConnected ? 'Neon Production Relational DB' : 'Local Sandbox Mode (Awaiting DATABASE_URL in .env)',
    tableCounts: isConnected ? tableCounts : { goals: localStore.goals.length, assessments: localStore.healthAssessments.length },
    timestamp: new Date().toISOString()
  });
});

// 2. Submit Financial Health Assessment (Guided 6 Steps)
app.post('/api/assessments/health', async (req, res) => {
  try {
    const data = req.body;
    
    // Server-side validation
    const monthlyIncome = Math.max(0, parseFloat(data.monthlyIncome) || 0);
    const monthlyExpenses = Math.max(0, parseFloat(data.monthlyExpenses) || 0);
    const monthlySavings = Math.max(0, parseFloat(data.monthlySavings) || 0);
    const cashSavings = Math.max(0, parseFloat(data.cashSavings) || 0);
    const investments = Math.max(0, parseFloat(data.investments) || 0);
    const propertyAssets = Math.max(0, parseFloat(data.propertyAssets) || 0);
    const loans = Math.max(0, parseFloat(data.loans) || 0);
    const creditDebt = Math.max(0, parseFloat(data.creditDebt) || 0);
    const otherLiabilities = Math.max(0, parseFloat(data.otherLiabilities) || 0);
    const retirementSavings = Math.max(0, parseFloat(data.retirementSavings) || 0);

    const totalAssets = cashSavings + investments + propertyAssets + retirementSavings;
    const totalLiabilities = loans + creditDebt + otherLiabilities;
    const netWorth = totalAssets - totalLiabilities;
    const surplus = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
    const emergencyMonths = monthlyExpenses > 0 ? (cashSavings / monthlyExpenses) : 0;
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) : 0.5;

    // Component Score Calculations (0-100 each)
    const cashflowScore = Math.min(100, Math.max(10, Math.round((surplus > 0 ? (surplus / (monthlyIncome || 1)) * 140 : 15))));
    const savingsScore = Math.min(100, Math.max(10, Math.round(savingsRate * 2.8)));
    const emergencyScore = Math.min(100, Math.max(10, Math.round(Math.min(1, emergencyMonths / 6) * 100)));
    const debtScore = Math.min(100, Math.max(10, Math.round(Math.max(0, 1 - debtRatio) * 100)));
    const investmentsScore = Math.min(100, Math.max(10, Math.round(Math.min(1, (investments + retirementSavings) / (totalAssets || 1)) * 100)));
    const retirementScore = Math.min(100, Math.max(10, Math.round(Math.min(1, retirementSavings / 500000) * 100)));
    const protectionScore = data.insuranceCoverage === 'Comprehensive' ? 95 : (data.insuranceCoverage === 'Basic' ? 70 : 40);

    const overallScore = Math.round(
      (cashflowScore * 0.18) +
      (savingsScore * 0.16) +
      (emergencyScore * 0.18) +
      (debtScore * 0.16) +
      (investmentsScore * 0.12) +
      (retirementScore * 0.10) +
      (protectionScore * 0.10)
    );

    const getStatus = (score) => {
      if (score >= 70) return { label: 'Healthy', status: 'healthy', color: '#2D6A4F' };
      if (score >= 45) return { label: 'Needs Attention', status: 'warning', color: '#B45309' };
      return { label: 'Priority', status: 'critical', color: '#B91C1C' };
    };

    const categories = {
      cashflow: {
        score: cashflowScore,
        ...getStatus(cashflowScore),
        explanation: surplus >= 0 ? `Net positive monthly cash surplus of $${Math.round(surplus).toLocaleString()} provides dependable liquidity.` : 'Monthly outgoings currently exceed income; cash reserves are diminishing.'
      },
      savings: {
        score: savingsScore,
        ...getStatus(savingsScore),
        explanation: `Current savings rate of ${savingsRate.toFixed(1)}% of gross monthly income.`
      },
      emergency: {
        score: emergencyScore,
        ...getStatus(emergencyScore),
        explanation: `Liquid reserves cover ${emergencyMonths.toFixed(1)} months of essential living expenses (benchmark is 6 months).`
      },
      debt: {
        score: debtScore,
        ...getStatus(debtScore),
        explanation: totalLiabilities > 0 ? `Total debt represents ${(debtRatio * 100).toFixed(1)}% of asset base. Manageable leverage.` : 'Virtually debt-free balance sheet.'
      },
      investments: {
        score: investmentsScore,
        ...getStatus(investmentsScore),
        explanation: `Productive financial assets represent ${Math.round(((investments + retirementSavings) / (totalAssets || 1)) * 100)}% of your asset allocation.`
      },
      retirement: {
        score: retirementScore,
        ...getStatus(retirementScore),
        explanation: retirementSavings > 250000 ? 'Substantial retirement capital base established and compounding.' : 'Retirement accumulation is in early foundational phases.'
      },
      protection: {
        score: protectionScore,
        ...getStatus(protectionScore),
        explanation: data.insuranceCoverage === 'Comprehensive' ? 'Well shielded against catastrophic disability and life contingencies.' : 'Recommend comprehensive review of life and income protection.'
      }
    };

    const result = {
      id: `fa-${Date.now()}`,
      overallScore,
      netWorth,
      totalAssets,
      totalLiabilities,
      surplus,
      categories,
      disclaimer: "Calculations are estimates for informational and planning purposes only and do not constitute guaranteed advice or performance promises."
    };

    // Store in DB if available
    if (await db.isDbConnected()) {
      try {
        await db.query(`
          INSERT INTO financial_assessments (
            overall_score, cashflow_score, savings_score, emergency_score,
            debt_score, investments_score, retirement_score, protection_score, answers_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `, [
          overallScore, cashflowScore, savingsScore, emergencyScore,
          debtScore, investmentsScore, retirementScore, protectionScore, JSON.stringify(data)
        ]);
      } catch (dbErr) {
        console.warn('Could not persist assessment to DB:', dbErr.message);
      }
    } else {
      localStore.healthAssessments.push(result);
    }

    res.json({ success: true, assessment: result });
  } catch (err) {
    console.error('Assessment calculation error:', err);
    res.status(500).json({ success: false, error: 'Internal calculation error' });
  }
});

// 3. Submit Risk Profile Assessment
app.post('/api/assessments/risk', async (req, res) => {
  try {
    const { answers } = req.body;
    
    // Server-side scoring (0 - 100)
    let totalScore = 0;
    if (answers && typeof answers === 'object') {
      const keys = Object.keys(answers);
      keys.forEach(k => {
        totalScore += parseInt(answers[k], 10) || 10;
      });
    } else {
      totalScore = 55;
    }

    let profile = 'Balanced';
    let explanation = '';
    let characteristics = [];
    let equityPct = 50;
    let fixedPct = 35;
    let realAssetsPct = 10;
    let cashPct = 5;

    if (totalScore <= 35) {
      profile = 'Conservative';
      equityPct = 15; fixedPct = 60; realAssetsPct = 10; cashPct = 15;
      explanation = 'Your paramount objective is capital preservation and liquidity. You exhibit low tolerance for interim portfolio drawdowns.';
      characteristics = [
        'Prioritizes purchasing power preservation over aggressive growth',
        'Emphasis on short-to-medium duration sovereign bonds and cash sweeps',
        'Minimal exposure to equity market volatility (10% - 20%)',
        'Recommended investment horizon: 1 - 3 years'
      ];
    } else if (totalScore <= 50) {
      profile = 'Moderately Conservative';
      equityPct = 30; fixedPct = 50; realAssetsPct = 12; cashPct = 8;
      explanation = 'You seek modest capital growth while maintaining a heavy buffer of income-producing and defensive assets.';
      characteristics = [
        'Income generation with secondary modest growth',
        'Defensive allocation dampens cyclical market shocks',
        'Balanced fixed income and dividend-paying securities',
        'Recommended investment horizon: 3 - 5 years'
      ];
    } else if (totalScore <= 68) {
      profile = 'Balanced';
      equityPct = 50; fixedPct = 35; realAssetsPct = 10; cashPct = 5;
      explanation = 'You aim for equitable long-term wealth compounding and are comfortable accepting moderate market fluctuations across market cycles.';
      characteristics = [
        'Balanced participation in global economic growth and defensive buffers',
        'Accepts temporary drawdowns in pursuit of inflation-beating returns',
        'Broad international equity and high-grade bond diversification',
        'Recommended investment horizon: 5 - 10 years'
      ];
    } else if (totalScore <= 85) {
      profile = 'Growth';
      equityPct = 70; fixedPct = 20; realAssetsPct = 7; cashPct = 3;
      explanation = 'You seek superior long-term capital accumulation and possess high emotional composure during sharp market drawdowns.';
      characteristics = [
        'Significant exposure to global equity markets (65% - 75%)',
        'Capacity to absorb 15% - 25% interim drawdowns without panic liquidation',
        'Strategic allocation to private markets and emerging real assets',
        'Recommended investment horizon: 7 - 12+ years'
      ];
    } else {
      profile = 'Aggressive';
      equityPct = 85; fixedPct = 10; realAssetsPct = 5; cashPct = 0;
      explanation = 'You target maximum long-term capital compounding and have an extended horizon with little to no near-term liquidity need.';
      characteristics = [
        'Predominantly equity and real asset concentrated allocation (85%+)',
        'Willingness to ride out severe multi-year bear markets',
        'Zero reliance on portfolio for near-term living expenses',
        'Recommended investment horizon: 12+ years'
      ];
    }

    const result = {
      score: totalScore,
      profile,
      explanation,
      characteristics,
      allocation: {
        equityPct,
        fixedPct,
        realAssetsPct,
        cashPct
      },
      notice: "FINORA provides asset allocation guidance for informational and planning purposes only. We do not recommend or execute specific securities, stocks, funds, or cryptocurrencies."
    };

    if (await db.isDbConnected()) {
      try {
        await db.query(`
          INSERT INTO risk_assessments (risk_score, risk_profile, answers_json)
          VALUES ($1, $2, $3);
        `, [totalScore, profile, JSON.stringify(answers)]);
      } catch (dbErr) {
        console.warn('Could not persist risk assessment to DB:', dbErr.message);
      }
    } else {
      localStore.riskAssessments.push(result);
    }

    res.json({ success: true, result });
  } catch (err) {
    console.error('Risk assessment error:', err);
    res.status(500).json({ success: false, error: 'Failed to process risk assessment' });
  }
});

// 4. Financial Goals: List & Create
app.get('/api/goals', async (req, res) => {
  if (await db.isDbConnected()) {
    try {
      const qRes = await db.query(`
        SELECT id, goal_type, goal_name, target_amount, current_savings, 
               target_date, monthly_contribution, priority, status
        FROM financial_goals
        ORDER BY created_at DESC
        LIMIT 25;
      `);
      return res.json({ success: true, goals: qRes.rows });
    } catch (e) {
      console.warn('DB fetch error, falling back to local store:', e.message);
    }
  }
  res.json({ success: true, goals: localStore.goals });
});

app.post('/api/goals', async (req, res) => {
  try {
    const { goal_type, goal_name, target_amount, current_savings, target_date, monthly_contribution, priority } = req.body;

    if (!goal_name || !target_amount || !target_date) {
      return res.status(400).json({ success: false, error: 'Please provide goal name, target amount, and target date.' });
    }

    const targetNum = parseFloat(target_amount);
    const currentNum = parseFloat(current_savings) || 0;
    const monthlyNum = parseFloat(monthly_contribution) || 0;
    const fundingGap = Math.max(0, targetNum - currentNum);

    // Calculate months remaining
    const targetD = new Date(target_date);
    const now = new Date();
    const monthsRemaining = Math.max(1, Math.round((targetD.getFullYear() - now.getFullYear()) * 12 + (targetD.getMonth() - now.getMonth())));
    const suggestedMonthly = monthsRemaining > 0 ? (fundingGap / monthsRemaining) : fundingGap;
    const progressPct = targetNum > 0 ? Math.min(100, Math.round((currentNum / targetNum) * 100)) : 0;

    const newGoal = {
      id: `goal-${Date.now()}`,
      goal_type: goal_type || 'Other',
      goal_name: goal_name.trim(),
      target_amount: targetNum,
      current_savings: currentNum,
      target_date,
      monthly_contribution: monthlyNum,
      priority: priority || 'Medium',
      status: 'In Progress',
      fundingGap,
      monthsRemaining,
      suggestedMonthly: Math.round(suggestedMonthly),
      progressPct
    };

    if (await db.isDbConnected()) {
      try {
        const qRes = await db.query(`
          INSERT INTO financial_goals (
            client_id, goal_type, goal_name, target_amount, current_savings,
            target_date, monthly_contribution, priority, status
          ) VALUES (
            (SELECT id FROM client_profiles LIMIT 1),
            $1, $2, $3, $4, $5, $6, $7, $8
          ) RETURNING *;
        `, [
          newGoal.goal_type, newGoal.goal_name, newGoal.target_amount, newGoal.current_savings,
          newGoal.target_date, newGoal.monthly_contribution, newGoal.priority, newGoal.status
        ]);
        return res.json({ success: true, goal: qRes.rows[0] });
      } catch (dbErr) {
        console.warn('DB insert goal failed, keeping local:', dbErr.message);
      }
    }

    localStore.goals.unshift(newGoal);
    res.json({ success: true, goal: newGoal });
  } catch (err) {
    console.error('Goal creation error:', err);
    res.status(500).json({ success: false, error: 'Could not create goal' });
  }
});

// 5. Submit Consultation Request (with honeypot anti-spam check)
app.post('/api/consultations', async (req, res) => {
  try {
    const { name, email, phone, country, method, interest, date, message, honeypot } = req.body;

    // Anti-spam honeypot detection
    if (honeypot) {
      console.warn('Spam submission detected and blocked.');
      return res.json({ success: true });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are strictly required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid email format.' });
    }

    const entry = {
      id: `consult-${Date.now()}`,
      full_name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      country: country || 'United States',
      preferred_contact_method: method || 'Email',
      area_of_interest: interest || 'Comprehensive Financial Review',
      preferred_date: date || null,
      message: message ? message.trim() : null,
      status: 'Pending',
      created_at: new Date().toISOString()
    };

    if (await db.isDbConnected()) {
      try {
        await db.query(`
          INSERT INTO advisor_consultation_requests (
            full_name, email, phone, country, preferred_contact_method, area_of_interest, preferred_date, message
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `, [
          entry.full_name, entry.email, entry.phone, entry.country,
          entry.preferred_contact_method, entry.area_of_interest, entry.preferred_date, entry.message
        ]);
      } catch (dbErr) {
        console.warn('DB consultation insert error:', dbErr.message);
      }
    } else {
      localStore.consultations.push(entry);
    }

    res.json({
      success: true,
      message: 'Consultation request received. A senior advisor will review your inquiry with strict fiduciary discretion.'
    });
  } catch (err) {
    console.error('Consultation request error:', err);
    res.status(500).json({ success: false, error: 'Failed to process request.' });
  }
});

// 6. Save Calculator Scenario Result
app.post('/api/calculators/save', async (req, res) => {
  try {
    const { calculator_type, inputs, outputs } = req.body;
    if (await db.isDbConnected()) {
      await db.query(`
        INSERT INTO calculator_results (calculator_type, inputs_json, outputs_json)
        VALUES ($1, $2, $3);
      `, [calculator_type, JSON.stringify(inputs), JSON.stringify(outputs)]);
    }
    res.json({ success: true, message: 'Scenario saved' });
  } catch (e) {
    res.json({ success: true, message: 'Scenario processed in session' });
  }
});

// ============================================================================
// PORTAL ROUTES (Protected with Authentication)
// ============================================================================

app.use('/api/auth', authRouter);
app.use('/api/client', clientRouter);
app.use('/api/advisor', advisorRouter);
app.use('/api/admin', adminRouter);

// ============================================================================
// ERROR HANDLER (Must be last)
// ============================================================================

app.use(errorHandler);

// Fallback for HTML5 routes
app.use((req, res) => {
  const filePath = path.join(rootDir, req.path);
  if (req.path.endsWith('.html') && fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log('\x1b[32m%s\x1b[0m', `✓ FINORA Financial Advisory Server running on http://localhost:${PORT}`);
  console.log('  Authentication System: ACTIVE');
  console.log('  Security Headers: ENABLED (Helmet)');
  console.log('  Session Management: ENABLED');
  console.log('  Roles: CLIENT | ADVISOR | ADMIN');
});
