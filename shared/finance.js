// Financial formulas shared by the /api routes and the browser pages.
// Pure functions only (no Node or DOM APIs). Inputs may be numbers or numeric strings.

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round1 = (x) => Math.round(x * 10) / 10;

// ---------------------------------------------------------------------------
// Financial health score (0-100): four parts worth 25 points each
// ---------------------------------------------------------------------------
export function calculateHealthScore(profile) {
  const income = num(profile.monthly_income);
  const expenses = num(profile.monthly_expenses);
  const debtPayments = num(profile.monthly_debt_payments);
  const emergency = num(profile.emergency_fund);
  const investments = num(profile.total_investments);

  // 1. Savings rate: what is left after expenses and debt payments. 20%+ earns full marks.
  const surplus = income - expenses - debtPayments;
  const savingsRate = income > 0 ? surplus / income : 0;
  const savingsPts = 25 * clamp01(savingsRate / 0.2);

  // 2. Emergency fund: months of expenses + debt payments covered. 6+ months earns full marks.
  const monthlyNeeds = expenses + debtPayments;
  const emergencyMonths = monthlyNeeds > 0 ? emergency / monthlyNeeds : (emergency > 0 ? 12 : 0);
  const emergencyPts = 25 * clamp01(emergencyMonths / 6);

  // 3. Debt-to-income: monthly debt payments / income. 15% or less earns full marks, 50%+ earns none.
  const dti = income > 0 ? debtPayments / income : (debtPayments > 0 ? 1 : 0);
  const dtiPts = 25 * clamp01((0.5 - dti) / 0.35);

  // 4. Investment ratio: invested assets / annual income. 1x annual income earns full marks.
  const investRatio = income > 0 ? investments / (income * 12) : 0;
  const investPts = 25 * clamp01(investRatio / 1);

  const status = (pts) => (pts >= 20 ? 'good' : pts >= 12 ? 'fair' : 'poor');

  const parts = [
    {
      key: 'savings_rate',
      label: 'Savings Rate',
      value: `${round1(savingsRate * 100)}%`,
      points: Math.round(savingsPts),
      status: status(savingsPts),
      explanation: savingsRate >= 0.2
        ? `You keep ${round1(savingsRate * 100)}% of your income after expenses and debt payments, at or above the 20% target.`
        : savingsRate > 0
          ? `You keep ${round1(savingsRate * 100)}% of your income each month. Aim for 20% to build wealth steadily.`
          : 'Your expenses and debt payments use all of your income. Reducing costs is the first priority.',
    },
    {
      key: 'emergency_fund',
      label: 'Emergency Fund',
      value: `${round1(emergencyMonths)} months`,
      points: Math.round(emergencyPts),
      status: status(emergencyPts),
      explanation: emergencyMonths >= 6
        ? `Your emergency fund covers ${round1(emergencyMonths)} months of costs, meeting the 6-month target.`
        : `Your emergency fund covers ${round1(emergencyMonths)} months of costs. In the UAE, 6 months is a sensible target.`,
    },
    {
      key: 'debt_to_income',
      label: 'Debt-to-Income',
      value: `${round1(dti * 100)}%`,
      points: Math.round(dtiPts),
      status: status(dtiPts),
      explanation: dti <= 0.15
        ? `Debt payments take ${round1(dti * 100)}% of your income, which is comfortably low.`
        : dti < 0.5
          ? `Debt payments take ${round1(dti * 100)}% of your income. Below 15% gives you more room to save.`
          : `Debt payments take ${round1(dti * 100)}% of your income, which is very high. A repayment plan should come first.`,
    },
    {
      key: 'investment_ratio',
      label: 'Investment Ratio',
      value: `${round1(investRatio)}x income`,
      points: Math.round(investPts),
      status: status(investPts),
      explanation: investRatio >= 1
        ? `Your investments equal ${round1(investRatio)} times your annual income, a strong base for long-term growth.`
        : `Your investments equal ${round1(investRatio)} times your annual income. Building towards 1x puts your money to work.`,
    },
  ];

  const score = Math.round(savingsPts + emergencyPts + dtiPts + investPts);
  let rating = 'Needs Attention';
  if (score >= 80) rating = 'Excellent';
  else if (score >= 60) rating = 'Good';
  else if (score >= 40) rating = 'Fair';

  return {
    score,
    rating,
    parts,
    metrics: {
      monthly_surplus: Math.round(surplus * 100) / 100,
      savings_rate_pct: round1(savingsRate * 100),
      emergency_months: round1(emergencyMonths),
      debt_to_income_pct: round1(dti * 100),
      investment_ratio: round1(investRatio),
      net_worth: num(profile.total_savings) + investments + emergency - num(profile.total_debt),
    },
  };
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export function goalProgress(goal) {
  const target = num(goal.target_amount);
  const current = num(goal.current_amount);
  const monthly = num(goal.monthly_contribution);
  const remaining = Math.max(0, target - current);
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  let monthsToGoal = null; // null = cannot be reached at the current contribution
  if (remaining === 0) monthsToGoal = 0;
  else if (monthly > 0) monthsToGoal = Math.ceil(remaining / monthly);

  let onTrack = null;
  if (goal.target_date && monthsToGoal !== null) {
    const now = new Date();
    const target_d = new Date(`${goal.target_date}T00:00:00`);
    const monthsLeft = (target_d.getFullYear() - now.getFullYear()) * 12 + (target_d.getMonth() - now.getMonth());
    onTrack = monthsToGoal <= Math.max(0, monthsLeft);
  } else if (goal.target_date && monthsToGoal === null) {
    onTrack = false;
  }

  return { remaining, pct, monthsToGoal, onTrack };
}

// ---------------------------------------------------------------------------
// Retirement projection
// ---------------------------------------------------------------------------
export function projectRetirement(plan) {
  const currentAge = num(plan.current_age);
  const retirementAge = num(plan.retirement_age);
  const savings = num(plan.current_savings);
  const monthly = num(plan.monthly_contribution);
  const annualReturn = num(plan.expected_return_pct) / 100;
  const inflation = num(plan.inflation_pct ?? 2.5) / 100;
  const retirementYears = num(plan.retirement_years ?? 25) || 25;
  const desiredMonthly = num(plan.desired_monthly_income);

  const years = Math.max(0, retirementAge - currentAge);
  const n = years * 12;
  const r = annualReturn / 12;
  const growth = Math.pow(1 + r, n);

  // Savings at retirement: current savings plus monthly contributions, compounded monthly.
  const projectedSavings = savings * growth + (r > 0 ? monthly * ((growth - 1) / r) : monthly * n);

  // Income need at retirement, inflated from today's AED.
  const inflationFactor = Math.pow(1 + inflation, years);
  const futureMonthlyIncome = desiredMonthly * inflationFactor;

  // Capital that pays that income (rising with inflation) for the whole retirement,
  // assuming a more cautious return (75% of the expected return) once retired.
  const m = retirementYears * 12;
  const realMonthly = Math.pow((1 + annualReturn * 0.75) / (1 + inflation), 1 / 12) - 1;
  const annuityFactor = Math.abs(realMonthly) > 1e-9 ? (1 - Math.pow(1 + realMonthly, -m)) / realMonthly : m;
  const requiredCapital = futureMonthlyIncome * annuityFactor;

  const gap = requiredCapital - projectedSavings;
  const additionalMonthlyNeeded = gap > 0
    ? (n > 0 ? (r > 0 ? (gap * r) / (growth - 1) : gap / n) : gap)
    : 0;

  // Monthly income the projected savings could support, in today's AED.
  const supportedMonthlyToday = annuityFactor > 0 ? projectedSavings / annuityFactor / inflationFactor : 0;
  const incomeGapMonthly = Math.max(0, desiredMonthly - supportedMonthlyToday);

  const fundedPct = requiredCapital > 0 ? Math.round((projectedSavings / requiredCapital) * 100) : 100;
  let status = 'Off Track';
  if (fundedPct >= 100) status = 'On Track';
  else if (fundedPct >= 75) status = 'Nearly There';

  const r2 = (x) => Math.round(x * 100) / 100;
  return {
    years_to_retirement: years,
    projected_savings: r2(projectedSavings),
    required_capital: r2(requiredCapital),
    gap: r2(gap),
    additional_monthly_needed: r2(additionalMonthlyNeeded),
    total_monthly_needed: r2(monthly + additionalMonthlyNeeded),
    supported_monthly_income: r2(supportedMonthlyToday),
    income_gap_monthly: r2(incomeGapMonthly),
    funded_pct: fundedPct,
    status,
    on_track: fundedPct >= 100,
  };
}

// ---------------------------------------------------------------------------
// Risk profile
// ---------------------------------------------------------------------------
export const RISK_PROFILES = ['Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive'];

export function riskProfileForScore(score) {
  if (score < 25) return 'Conservative';
  if (score < 45) return 'Moderate';
  if (score < 65) return 'Balanced';
  if (score < 82) return 'Growth';
  return 'Aggressive';
}

export const RISK_PROFILE_SUMMARIES = {
  Conservative: 'Protecting your capital matters most to you. You prefer small, steady returns over large swings in value.',
  Moderate: 'You want some growth but value stability. You can accept small, short-lived falls in value.',
  Balanced: 'You seek a balance of growth and stability, and are comfortable with moderate ups and downs over a medium to long horizon.',
  Growth: 'You are focused on long-term growth and can stay calm through significant market falls.',
  Aggressive: 'You aim for maximum long-term growth and are comfortable with large swings in value along the way.',
};
