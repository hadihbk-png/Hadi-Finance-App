/**
 * FINORA Client Portal Routes
 * Endpoints for client dashboard, goals, finances, retirement, scenarios
 */

import express from 'express';
import db from '../db.js';
import { requireAuth, requireRole, auditLog } from '../middleware.js';

const router = express.Router();

// Middleware: Ensure client owns the data they're accessing
const ownsClientProfile = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    // Get client profile to verify ownership
    const query = `
      SELECT id, user_id FROM client_profiles WHERE id = $1
    `;
    
    const result = await db.query(query, [clientId]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Client profile not found' });
    }
    
    if (result.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'You do not have access to this profile' });
    }
    
    req.clientProfile = result.rows[0];
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

// GET /api/client/dashboard
router.get('/dashboard', requireAuth, requireRole('client'), auditLog('dashboard'), async (req, res) => {
  try {
    // Get client profile
    const clientQuery = `
      SELECT cp.* FROM client_profiles cp
      WHERE cp.user_id = $1
    `;
    
    const clientResult = await db.query(clientQuery, [req.user.id]);
    
    if (!clientResult.rows[0]) {
      return res.status(404).json({ error: 'Client profile not found' });
    }
    
    const clientId = clientResult.rows[0].id;
    const profile = clientResult.rows[0];
    
    // Get financial health score (most recent assessment)
    const healthQuery = `
      SELECT overall_score, cashflow_score, savings_score, emergency_score, debt_score, 
             investments_score, retirement_score, protection_score, created_at
      FROM financial_assessments
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const healthResult = await db.query(healthQuery, [clientId]);
    const healthAssessment = healthResult.rows[0] || null;
    
    // Get risk profile
    const riskQuery = `
      SELECT risk_score, risk_profile, created_at
      FROM risk_assessments
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const riskResult = await db.query(riskQuery, [clientId]);
    const riskProfile = riskResult.rows[0] || null;
    
    // Get retirement plan
    const retirementQuery = `
      SELECT current_age, target_retirement_age, projected_fund, required_fund, funding_gap, readiness_status
      FROM retirement_plans
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const retirementResult = await db.query(retirementQuery, [clientId]);
    const retirementPlan = retirementResult.rows[0] || null;
    
    // Get net worth (sum of assets - sum of liabilities)
    const netWorthQuery = `
      SELECT 
        (SELECT COALESCE(SUM(current_value), 0) FROM assets WHERE client_id = $1)::BIGINT as total_assets,
        (SELECT COALESCE(SUM(balance), 0) FROM liabilities WHERE client_id = $1)::BIGINT as total_liabilities
    `;
    
    const netWorthResult = await db.query(netWorthQuery, [clientId]);
    const { total_assets, total_liabilities } = netWorthResult.rows[0];
    const netWorth = total_assets - total_liabilities;
    
    // Get active goals
    const goalsQuery = `
      SELECT id, goal_type, goal_name, target_amount, current_savings, target_date, status
      FROM financial_goals
      WHERE client_id = $1 AND status = 'In Progress'
      ORDER BY priority DESC, target_date ASC
      LIMIT 5
    `;
    
    const goalsResult = await db.query(goalsQuery, [clientId]);
    const goals = goalsResult.rows;
    
    // Get savings rate (sum of expenses + savings / income)
    const cashFlowQuery = `
      SELECT 
        (SELECT COALESCE(SUM(monthly_amount), 0) FROM income WHERE client_id = $1)::BIGINT as total_income,
        (SELECT COALESCE(SUM(monthly_amount), 0) FROM expenses WHERE client_id = $1)::BIGINT as total_expenses
    `;
    
    const cashFlowResult = await db.query(cashFlowQuery, [clientId]);
    const { total_income, total_expenses } = cashFlowResult.rows[0];
    const monthlySavings = total_income - total_expenses;
    const savingsRate = total_income > 0 ? Math.round((monthlySavings / total_income) * 100) : 0;
    
    // Build financial plan guidance
    const financialPlan = buildFinancialPlan(
      healthAssessment,
      netWorth,
      monthlySavings,
      retirementPlan,
      goals
    );
    
    res.json({
      success: true,
      dashboard: {
        profile: {
          name: `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          country: profile.country
        },
        financialHealth: {
          score: healthAssessment?.overall_score || null,
          status: getHealthStatus(healthAssessment?.overall_score),
          breakdown: healthAssessment ? {
            cashflow: healthAssessment.cashflow_score,
            savings: healthAssessment.savings_score,
            emergency: healthAssessment.emergency_score,
            debt: healthAssessment.debt_score,
            investments: healthAssessment.investments_score,
            retirement: healthAssessment.retirement_score,
            protection: healthAssessment.protection_score
          } : null,
          assessmentDate: healthAssessment?.created_at || null
        },
        netWorth: {
          assets: total_assets,
          liabilities: total_liabilities,
          netWorth: netWorth,
          status: getNetWorthStatus(netWorth)
        },
        cashFlow: {
          monthlyIncome: total_income,
          monthlyExpenses: total_expenses,
          monthlySavings: monthlySavings,
          savingsRate: savingsRate
        },
        riskProfile: riskProfile ? {
          score: riskProfile.risk_score,
          category: riskProfile.risk_profile,
          assessmentDate: riskProfile.created_at
        } : null,
        retirementReadiness: retirementPlan ? {
          currentAge: retirementPlan.current_age,
          targetRetirementAge: retirementPlan.target_retirement_age,
          yearsToRetirement: retirementPlan.target_retirement_age - retirementPlan.current_age,
          projectedFund: retirementPlan.projected_fund,
          requiredFund: retirementPlan.required_fund,
          fundingGap: retirementPlan.funding_gap,
          status: retirementPlan.readiness_status
        } : null,
        activeGoals: goals.map(g => ({
          id: g.id,
          type: g.goal_type,
          name: g.goal_name,
          target: g.target_amount,
          current: g.current_savings,
          progress: Math.min(100, (g.current_savings / g.target_amount) * 100),
          targetDate: g.target_date,
          status: g.status
        })),
        financialPlan: financialPlan
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/client/goals
router.get('/goals', requireAuth, requireRole('client'), async (req, res) => {
  try {
    const clientQuery = `
      SELECT id FROM client_profiles WHERE user_id = $1
    `;
    
    const clientResult = await db.query(clientQuery, [req.user.id]);
    
    if (!clientResult.rows[0]) {
      return res.status(404).json({ error: 'Client profile not found' });
    }
    
    const clientId = clientResult.rows[0].id;
    
    const goalsQuery = `
      SELECT * FROM financial_goals
      WHERE client_id = $1
      ORDER BY priority DESC, target_date ASC
    `;
    
    const goalsResult = await db.query(goalsQuery, [clientId]);
    
    res.json({
      goals: goalsResult.rows.map(g => ({
        id: g.id,
        type: g.goal_type,
        name: g.goal_name,
        target: g.target_amount,
        current: g.current_savings,
        progress: Math.min(100, (g.current_savings / g.target_amount) * 100),
        targetDate: g.target_date,
        monthlyContribution: g.monthly_contribution,
        priority: g.priority,
        status: g.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load goals' });
  }
});

// POST /api/client/goals
router.post('/goals', requireAuth, requireRole('client'), auditLog('financial_goals'), async (req, res) => {
  try {
    const { goalType, goalName, targetAmount, currentSavings, targetDate, monthlyContribution, priority } = req.body;
    
    const clientQuery = `SELECT id FROM client_profiles WHERE user_id = $1`;
    const clientResult = await db.query(clientQuery, [req.user.id]);
    
    if (!clientResult.rows[0]) {
      return res.status(404).json({ error: 'Client profile not found' });
    }
    
    const clientId = clientResult.rows[0].id;
    
    const insertQuery = `
      INSERT INTO financial_goals (client_id, goal_type, goal_name, target_amount, current_savings, target_date, monthly_contribution, priority, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'In Progress')
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      clientId,
      goalType,
      goalName,
      targetAmount,
      currentSavings || 0,
      targetDate,
      monthlyContribution || 0,
      priority || 'Medium'
    ]);
    
    res.status(201).json({
      success: true,
      goal: result.rows[0],
      message: 'Goal created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create goal' });
  }
});

// PUT /api/client/goals/:goalId
router.put('/goals/:goalId', requireAuth, requireRole('client'), auditLog('financial_goals'), async (req, res) => {
  try {
    const { goalId } = req.params;
    const { currentSavings, targetDate, monthlyContribution, status } = req.body;
    
    const updateQuery = `
      UPDATE financial_goals
      SET current_savings = COALESCE($1, current_savings),
          target_date = COALESCE($2, target_date),
          monthly_contribution = COALESCE($3, monthly_contribution),
          status = COALESCE($4, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND client_id = (SELECT id FROM client_profiles WHERE user_id = $6)
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      currentSavings,
      targetDate,
      monthlyContribution,
      status,
      goalId,
      req.user.id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({
      success: true,
      goal: result.rows[0],
      message: 'Goal updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update goal' });
  }
});

// GET /api/client/retirement
router.get('/retirement', requireAuth, requireRole('client'), async (req, res) => {
  try {
    const clientQuery = `SELECT id FROM client_profiles WHERE user_id = $1`;
    const clientResult = await db.query(clientQuery, [req.user.id]);
    
    if (!clientResult.rows[0]) {
      return res.status(404).json({ error: 'Client profile not found' });
    }
    
    const retirementQuery = `
      SELECT * FROM retirement_plans
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await db.query(retirementQuery, [clientResult.rows[0].id]);
    
    res.json({
      retirement: result.rows[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load retirement data' });
  }
});

// GET /api/client/risk
router.get('/risk', requireAuth, requireRole('client'), async (req, res) => {
  try {
    const clientQuery = `SELECT id FROM client_profiles WHERE user_id = $1`;
    const clientResult = await db.query(clientQuery, [req.user.id]);
    
    if (!clientResult.rows[0]) {
      return res.status(404).json({ error: 'Client profile not found' });
    }
    
    const riskQuery = `
      SELECT * FROM risk_assessments
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await db.query(riskQuery, [clientResult.rows[0].id]);
    
    res.json({
      risk: result.rows[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load risk data' });
  }
});

// POST /api/client/scenarios (create "What If?" scenario)
router.post('/scenarios', requireAuth, requireRole('client'), async (req, res) => {
  try {
    const { scenarioName, scenarioType, assumptions, results } = req.body;
    
    const clientQuery = `SELECT id FROM client_profiles WHERE user_id = $1`;
    const clientResult = await db.query(clientQuery, [req.user.id]);
    
    if (!clientResult.rows[0]) {
      return res.status(404).json({ error: 'Client profile not found' });
    }
    
    const insertQuery = `
      INSERT INTO client_scenarios (client_id, scenario_name, scenario_type, assumptions_json, results_json, is_saved, is_primary)
      VALUES ($1, $2, $3, $4, $5, FALSE, FALSE)
      RETURNING *
    `;
    
    const result = await db.query(insertQuery, [
      clientResult.rows[0].id,
      scenarioName,
      scenarioType,
      JSON.stringify(assumptions),
      JSON.stringify(results)
    ]);
    
    res.status(201).json({
      success: true,
      scenario: result.rows[0],
      message: 'Scenario created. Click "Save Scenario" to persist.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to create scenario' });
  }
});

// Helper functions
function getHealthStatus(score) {
  if (!score) return null;
  if (score >= 75) return 'Healthy';
  if (score >= 50) return 'Needs Attention';
  return 'Priority';
}

function getNetWorthStatus(netWorth) {
  if (netWorth > 0) return 'Positive';
  if (netWorth === 0) return 'Breakeven';
  return 'Negative';
}

function buildFinancialPlan(healthAssessment, netWorth, monthlySavings, retirementPlan, goals) {
  const plan = [];
  
  // Rule-based priority suggestions
  if (!healthAssessment || healthAssessment.emergency_score < 60) {
    plan.push({
      priority: 1,
      action: 'Build emergency fund',
      description: 'Establish 3-6 months of living expenses in accessible savings',
      target: 'Emergency Fund'
    });
  }
  
  if (healthAssessment && healthAssessment.debt_score < 70) {
    plan.push({
      priority: 2,
      action: 'Reduce high-interest debt',
      description: 'Focus on credit card and personal loans before investing',
      target: 'Debt Reduction'
    });
  }
  
  if (!retirementPlan || retirementPlan.readiness_status === 'Needs Attention') {
    plan.push({
      priority: 2,
      action: 'Increase retirement savings',
      description: 'Consider increasing contributions to retirement accounts',
      target: 'Retirement Planning'
    });
  }
  
  if (healthAssessment && healthAssessment.investments_score < 60) {
    plan.push({
      priority: 3,
      action: 'Review investment allocation',
      description: 'Ensure your portfolio matches your risk profile and time horizon',
      target: 'Investment Strategy'
    });
  }
  
  return plan.slice(0, 4); // Return top 4 recommendations
}

export default router;
