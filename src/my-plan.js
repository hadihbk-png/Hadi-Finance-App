// My Plan dashboard: a summary of everything the member has saved (/api/dashboard).
import './nav.js';
import { api, requireLogin, formatAED, formatDate, escapeHtml, animateCount } from './app.js';

const grid = document.getElementById('plan-grid');

const CALC_NAMES = {
  'net-worth': 'Net Worth',
  savings: 'Savings Goal',
  'compound-growth': 'Compound Growth',
  mortgage: 'Mortgage',
  education: 'Education Planner',
};

const STATUS_PILL = {
  'On Track': 'status-pill--positive',
  'Nearly There': 'status-pill--warning',
  'Off Track': 'status-pill--critical',
  new: 'status-pill--neutral',
  contacted: 'status-pill--warning',
  booked: 'status-pill--positive',
  closed: 'status-pill--neutral',
};

const card = (cls, label, body, link, linkText) => `
  <div class="plan-card ${cls}">
    <span class="plan-card__label">${label}</span>
    ${body}
    ${link ? `<div class="plan-card__foot"><a href="${link}">${linkText} →</a></div>` : ''}
  </div>`;

function healthCard(health) {
  if (!health) {
    return card('', 'Financial Health',
      `<p class="plan-card__big">—</p><p class="plan-card__text">Add your income, spending, savings and debt to get your score out of 100.</p>`,
      '/health-assessment.html', 'Get my score');
  }
  const weakest = [...health.parts].sort((a, b) => a.points - b.points)[0];
  return card('', 'Financial Health', `
    <p class="plan-card__big"><span data-count="${health.score}">0</span><small> / 100</small></p>
    <span class="status-pill ${health.score >= 60 ? 'status-pill--positive' : health.score >= 40 ? 'status-pill--warning' : 'status-pill--critical'}">${escapeHtml(health.rating)}</span>
    <p class="plan-card__text mt-2">Biggest opportunity: <strong>${escapeHtml(weakest.label)}</strong> (${weakest.points}/25).</p>`,
  '/health-assessment.html', 'Update my numbers');
}

function riskCard(risk) {
  if (!risk) {
    return card('', 'Risk Profile',
      '<p class="plan-card__big">—</p><p class="plan-card__text">Answer 10 quick questions to find your risk profile and matching portfolio.</p>',
      '/risk-assessment.html', 'Take the questionnaire');
  }
  return card('', 'Risk Profile', `
    <p class="plan-card__big" style="font-size:2.2rem">${escapeHtml(risk.risk_profile)}</p>
    <p class="plan-card__text">Score ${risk.score}/100 · ${escapeHtml(risk.portfolio_name || '')}<br>
    Expected ${Number(risk.expected_return_min)}% to ${Number(risk.expected_return_max)}% a year. Assessed ${formatDate(risk.created_at)}.</p>`,
  '/investment-planning.html', 'View my portfolio');
}

function retirementCard(retirement) {
  if (!retirement) {
    return card('', 'Retirement',
      '<p class="plan-card__big">—</p><p class="plan-card__text">Project your savings at retirement and see whether you are on track.</p>',
      '/retirement-planner.html', 'Plan my retirement');
  }
  const { plan, projection: p } = retirement;
  return card('', 'Retirement', `
    <p class="plan-card__big"><span data-count="${Math.min(p.funded_pct, 999)}">0</span><small>% funded</small></p>
    <span class="status-pill ${STATUS_PILL[p.status]}">${p.status}</span>
    <p class="plan-card__text mt-2">Retiring at ${plan.retirement_age} with a projected ${formatAED(p.projected_savings)}.
    ${p.gap > 0 ? `Save about ${formatAED(p.additional_monthly_needed)} more a month to close the gap.` : 'You are on track for your target income.'}</p>`,
  '/retirement-planner.html', 'Adjust my plan');
}

function goalsCard(goals) {
  if (!goals.total) {
    return card('plan-card--wide', 'Goals', `
      <p class="plan-card__big" style="font-size:2rem">No goals yet. Let's set your first one!</p>
      <p class="plan-card__text">A home deposit, school fees or a family trip. Add a goal to see exactly how long it will take.</p>`,
    '/goals.html', 'Add a goal');
  }
  const pct = goals.target_total > 0 ? Math.round((goals.saved_total / goals.target_total) * 100) : 0;
  const top = goals.top.map((g) => `
    <div class="plan-goal">
      <div class="plan-goal__row"><span>${escapeHtml(g.name)}</span><strong>${g.progress.pct}%</strong></div>
      <div class="progress-bar-track"><div class="progress-bar-fill progress-bar-fill--gold" style="width:0%" data-width="${g.progress.pct}%"></div></div>
    </div>`).join('');
  return card('plan-card--wide', 'Goals', `
    <div class="plan-kpis mt-2">
      <div class="plan-kpi"><span class="plan-kpi__label">Active</span><span class="plan-kpi__value">${goals.active}${goals.achieved ? ` <small style="color:var(--positive)">+${goals.achieved} achieved</small>` : ''}</span></div>
      <div class="plan-kpi"><span class="plan-kpi__label">Saved / Target</span><span class="plan-kpi__value">${pct}%</span></div>
      <div class="plan-kpi"><span class="plan-kpi__label">Monthly</span><span class="plan-kpi__value">${formatAED(goals.monthly_total)}</span></div>
    </div>
    ${top || '<p class="plan-empty">All your goals are achieved or paused.</p>'}
    <p class="field-hint">${formatAED(goals.saved_total)} saved towards ${formatAED(goals.target_total)} across active goals.</p>`,
  '/goals.html', 'Manage goals');
}

function calculationsCard(calcs) {
  const body = calcs.length
    ? `<ul class="plan-list mt-2">${calcs.map((c) => {
      const [label, value] = Object.entries(c.result)[0] || ['', ''];
      return `<li><span><strong>${escapeHtml(CALC_NAMES[c.calculator_type] || c.calculator_type)}</strong><br><span class="plan-list__muted">${escapeHtml(label)}: ${escapeHtml(value)}</span></span><span class="plan-list__muted">${formatDate(c.created_at, { day: 'numeric', month: 'short' })}</span></li>`;
    }).join('')}</ul>`
    : '<p class="plan-empty">No saved calculations yet. Use the calculators and press Save to keep a result here.</p>';
  return card('plan-card--half', 'Recent Calculations', body, '/calculators.html', 'Open calculators');
}

function consultationsCard(items) {
  const body = items.length
    ? `<ul class="plan-list mt-2">${items.map((c) => `
        <li><span><strong>${escapeHtml(c.service_name || 'General enquiry')}</strong><br>
        <span class="plan-list__muted">${c.preferred_date ? `Preferred ${formatDate(c.preferred_date)}` : 'No date chosen'} · FIN-${new Date(c.created_at).getFullYear()}-${String(c.id).padStart(4, '0')}</span></span>
        <span class="status-pill ${STATUS_PILL[c.status]}" style="text-transform:capitalize">${escapeHtml(c.status)}</span></li>`).join('')}</ul>`
    : '<p class="plan-empty">No consultation requests yet. Book a session to review your plan with an advisor.</p>';
  return card('plan-card--half', 'Consultations', body, '/contact.html', 'Book a consultation');
}

function skeleton() {
  grid.innerHTML = ['', '', '', 'plan-card--wide', '', 'plan-card--half', 'plan-card--half'].map((cls) => `
    <div class="plan-card ${cls}" aria-hidden="true">
      <span class="skeleton skeleton--label"></span><span class="skeleton skeleton--title" style="height:2.4rem;width:40%"></span>
      <span class="skeleton skeleton--line"></span><span class="skeleton skeleton--line" style="width:70%"></span>
    </div>`).join('');
}

async function load() {
  skeleton();
  const user = await requireLogin();
  document.getElementById('plan-greeting').textContent = `Welcome back, ${user.first_name}`;
  try {
    const d = await api('/api/dashboard');
    const steps = [d.health, d.goals.total, d.risk, d.retirement].filter(Boolean).length;
    document.getElementById('plan-subtitle').textContent = steps === 4
      ? 'Your plan is complete. Review it regularly as life changes.'
      : `You have completed ${steps} of 4 planning steps. Keep going to build your full plan.`;

    grid.innerHTML = [
      healthCard(d.health),
      riskCard(d.risk),
      retirementCard(d.retirement),
      goalsCard(d.goals),
      card('', 'Member Since', `
        <p class="plan-card__big" style="font-size:2rem">${formatDate(d.user.member_since, { month: 'long', year: 'numeric' })}</p>
        <p class="plan-card__text">Everything on this page is private to your account.</p>`, '/insights.html', 'Read our latest insights'),
      calculationsCard(d.calculations),
      consultationsCard(d.consultations),
    ].join('');

    grid.querySelectorAll('[data-count]').forEach((el) => animateCount(el, el.dataset.count, { duration: 1000 }));
    requestAnimationFrame(() => grid.querySelectorAll('[data-width]').forEach((b) => { b.style.width = b.dataset.width; }));
  } catch (err) {
    grid.innerHTML = `<div class="plan-card plan-card--wide"><p class="plan-empty">${escapeHtml(err.message)}</p></div>`;
  } finally {
    grid.removeAttribute('aria-busy');
  }
}

load();
