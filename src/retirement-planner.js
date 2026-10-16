// Retirement page: live projection while adjusting sliders, saved to /api/retirement.
import './nav.js';
import { api, requireLogin, toast, formatAED, formatDate, setBusy } from './app.js';
import { projectRetirement } from '../shared/finance.js';

const $ = (id) => document.getElementById(id);

const inputs = {
  current_age: $('rp-current-age'),
  retirement_age: $('rp-target-age'),
  current_savings: $('rp-current-savings'),
  monthly_contribution: $('rp-monthly-contrib'),
  desired_monthly_income: $('rp-desired-income'),
  retirement_years: $('rp-duration'),
  expected_return_pct: $('rp-return'),
  inflation_pct: $('rp-inflation'),
};

const savedNote = $('rp-saved-note');
const saveBtn = $('btn-save-retirement');
let savedSnapshot = null;

function readPlan() {
  const plan = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value]));
  if (Number(plan.retirement_age) <= Number(plan.current_age)) {
    plan.retirement_age = String(Math.min(85, Number(plan.current_age) + 1));
    inputs.retirement_age.value = plan.retirement_age;
  }
  return plan;
}

function render() {
  const plan = readPlan();
  const p = projectRetirement(plan);

  $('readout-rp-current-age').textContent = `${plan.current_age} yrs`;
  $('readout-rp-target-age').textContent = `${plan.retirement_age} yrs`;
  $('readout-rp-current-savings').textContent = formatAED(plan.current_savings);
  $('readout-rp-monthly-contrib').textContent = formatAED(plan.monthly_contribution);
  $('readout-rp-desired-income').textContent = `${formatAED(plan.desired_monthly_income)} / mo`;
  $('readout-rp-duration').textContent = `${plan.retirement_years} yrs`;
  $('readout-rp-return').textContent = `${Number(plan.expected_return_pct).toFixed(1)}%`;
  $('readout-rp-inflation').textContent = `${Number(plan.inflation_pct).toFixed(1)}%`;

  $('res-rp-years').textContent = `${p.years_to_retirement} Year${p.years_to_retirement === 1 ? '' : 's'}`;
  $('res-rp-projected').textContent = formatAED(p.projected_savings);
  $('res-rp-required').textContent = formatAED(p.required_capital);
  $('res-rp-supported').textContent = `${formatAED(p.supported_monthly_income)} / mo`;

  const gapEl = $('res-rp-gap');
  if (p.gap > 0) {
    gapEl.textContent = `-${formatAED(p.gap)} Shortfall`;
    gapEl.className = 'text-critical';
    $('res-rp-suggested').textContent = `${formatAED(p.total_monthly_needed)} / mo`;
  } else {
    gapEl.textContent = `+${formatAED(Math.abs(p.gap))} Surplus`;
    gapEl.className = 'text-positive';
    $('res-rp-suggested').textContent = `${formatAED(plan.monthly_contribution)} / mo (on track)`;
  }

  const pill = $('rp-readiness-pill');
  const bar = $('rp-readiness-bar');
  bar.style.width = `${Math.min(100, p.funded_pct)}%`;
  bar.style.backgroundColor = '';
  if (p.status === 'On Track') {
    pill.textContent = 'On Track';
    pill.className = 'status-pill status-pill--positive';
    bar.className = 'progress-bar-fill progress-bar-fill--green';
    $('rp-readiness-text').textContent = `Your projected savings of ${formatAED(p.projected_savings)} could support your target income of ${formatAED(plan.desired_monthly_income)} a month for ${plan.retirement_years} years.`;
  } else if (p.status === 'Nearly There') {
    pill.textContent = 'Nearly There';
    pill.className = 'status-pill status-pill--warning';
    bar.className = 'progress-bar-fill progress-bar-fill--amber';
    $('rp-readiness-text').textContent = `You are on course for ${p.funded_pct}% of the savings you need. A modest increase in your monthly saving would close the gap.`;
  } else {
    pill.textContent = 'Off Track';
    pill.className = 'status-pill status-pill--critical';
    bar.className = 'progress-bar-fill';
    bar.style.backgroundColor = 'var(--critical)';
    $('rp-readiness-text').textContent = `You are on course for ${p.funded_pct}% of the savings you need. Consider saving more, retiring later, or reviewing your plan with an advisor.`;
  }

  $('rp-income-gap').innerHTML = p.income_gap_monthly > 0
    ? `Gap versus your desired income: <strong>${formatAED(p.income_gap_monthly)} a month</strong> (in today's AED). To close it, save about <strong>${formatAED(p.additional_monthly_needed)} more each month</strong>, for a total of ${formatAED(p.total_monthly_needed)} a month.`
    : `<strong>No income gap.</strong> Your projected savings could pay ${formatAED(p.supported_monthly_income)} a month in today's AED, above your ${formatAED(plan.desired_monthly_income)} target.`;

  const dirty = savedSnapshot !== JSON.stringify(plan);
  if (savedSnapshot) savedNote.textContent = dirty ? 'You have unsaved changes' : savedNote.dataset.saved;
}

function applyPlan(plan) {
  Object.entries(inputs).forEach(([k, el]) => {
    if (plan[k] !== undefined && plan[k] !== null) el.value = Number(plan[k]);
  });
  savedSnapshot = JSON.stringify(readPlan());
  savedNote.dataset.saved = `Saved ${formatDate(plan.updated_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  savedNote.textContent = savedNote.dataset.saved;
}

Object.values(inputs).forEach((el) => el.addEventListener('input', render));

saveBtn.addEventListener('click', async () => {
  setBusy(saveBtn, true);
  try {
    const { plan, projection } = await api('/api/retirement', { method: 'PUT', body: readPlan() });
    applyPlan(plan);
    render();
    toast(`Retirement plan saved. Status: ${projection.status}.`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(saveBtn, false);
  }
});

async function load() {
  render();
  await requireLogin();
  try {
    const { plan } = await api('/api/retirement');
    if (plan) {
      applyPlan(plan);
      render();
    } else {
      savedNote.textContent = 'Not saved yet. Adjust the sliders, then save.';
    }
  } catch (err) {
    savedNote.textContent = err.message;
  }
}

load();
