// Financial Health page: load/save the financial profile and show the health score.
import './nav.js';
import { api, requireLogin, toast, formatAED, formatDate, escapeHtml, animateCount, showFieldError, clearFieldErrors, setBusy } from './app.js';
import { calculateHealthScore } from '../shared/finance.js';

const FIELDS = [
  'monthly_income', 'monthly_expenses', 'monthly_debt_payments',
  'emergency_fund', 'total_savings', 'total_investments', 'total_debt',
];

const STATUS_PILL = {
  good: ['status-pill--positive', 'Healthy'],
  fair: ['status-pill--warning', 'Could Improve'],
  poor: ['status-pill--critical', 'Needs Attention'],
};

const RATING_PILL = {
  Excellent: 'status-pill--positive',
  Good: 'status-pill--positive',
  Fair: 'status-pill--warning',
  'Needs Attention': 'status-pill--critical',
};

const RATING_TEXT = {
  Excellent: 'Your finances are in excellent shape. Keep reviewing them as your life changes.',
  Good: 'You have a solid foundation. One or two areas below can lift your score further.',
  Fair: 'You are on your way. Focus on the lowest-scoring area first for the biggest improvement.',
  'Needs Attention': 'There is real room to strengthen your position. Start with the area marked Needs Attention.',
};

const card = document.getElementById('health-scorecard');
const form = document.getElementById('profile-form');

function renderSkeleton() {
  card.innerHTML = `
    <div class="scorecard-hero-metric" aria-hidden="true">
      <span class="skeleton skeleton--circle"></span>
      <div style="flex:1"><span class="skeleton skeleton--label"></span><span class="skeleton skeleton--title"></span>
      <span class="skeleton skeleton--line"></span><span class="skeleton skeleton--line" style="width:70%"></span></div>
    </div>
    <div class="category-breakdown-grid">${'<div class="category-card"><span class="skeleton skeleton--label"></span><span class="skeleton skeleton--title" style="width:30%"></span><span class="skeleton skeleton--line"></span><span class="skeleton skeleton--line" style="width:75%"></span></div>'.repeat(4)}</div>`;
}

function renderEmpty() {
  card.innerHTML = `
    <div class="empty-state" style="border:none;padding:2rem 1rem;">
      <div class="empty-state__icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </div>
      <h3 class="empty-state__title">No score yet</h3>
      <p class="empty-state__text">Fill in your numbers and press <strong>Save &amp; Calculate</strong>. Your score from 0 to 100 will appear here, with tips for each part.</p>
    </div>`;
}

function renderScore(health) {
  const parts = health.parts.map((p, i) => {
    const [pillClass, pillText] = STATUS_PILL[p.status];
    return `
      <div class="category-card">
        <div class="category-card__header">
          <span class="category-name">${i + 1}. ${escapeHtml(p.label)}</span>
          <span class="status-pill ${pillClass}">${pillText}</span>
        </div>
        <div class="category-score-row">
          <span class="category-score-val">${p.points}<small style="font-size:0.9rem;color:var(--text-light)">/25</small></span>
          <span class="category-metric">${escapeHtml(p.value)}</span>
        </div>
        <div class="progress-bar-track"><div class="progress-bar-fill progress-bar-fill--gold" style="width:0%" data-width="${p.points * 4}%"></div></div>
        <p class="category-explanation">${escapeHtml(p.explanation)}</p>
      </div>`;
  }).join('');

  const m = health.metrics;
  card.innerHTML = `
    <div class="scorecard-hero-metric">
      <div class="overall-circle" style="--score:${health.score}">
        <span class="overall-number" id="score-number">0</span>
        <span class="overall-scale">/ 100</span>
      </div>
      <div class="overall-verdict">
        <span class="section-label">FINANCIAL HEALTH SCORE</span><br>
        <span class="status-pill ${RATING_PILL[health.rating]} mt-1">${escapeHtml(health.rating)}</span>
        <h3 class="verdict-heading">${health.score >= 60 ? 'A strong foundation' : 'Room to grow stronger'}</h3>
        <p class="verdict-desc">${RATING_TEXT[health.rating]}</p>
      </div>
    </div>
    <div class="category-breakdown-grid">${parts}</div>
    <div class="metric-strip">
      <div class="metric-strip__item"><span class="metric-strip__label">Monthly surplus</span><span class="metric-strip__value">${formatAED(m.monthly_surplus)}</span></div>
      <div class="metric-strip__item"><span class="metric-strip__label">Estimated net worth</span><span class="metric-strip__value">${formatAED(m.net_worth)}</span></div>
      <div class="metric-strip__item"><span class="metric-strip__label">Emergency cover</span><span class="metric-strip__value">${m.emergency_months} months</span></div>
    </div>
    <div class="calc-disclaimer-card mt-4">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8975A" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      <span>The score is an educational estimate based on the figures you entered. It is not regulated financial advice.</span>
    </div>
    <div class="text-center mt-4"><a href="/contact.html" class="btn btn--primary">Review Results With an Advisor →</a></div>`;

  animateCount(document.getElementById('score-number'), health.score, { duration: 1100 });
  requestAnimationFrame(() => {
    card.querySelectorAll('[data-width]').forEach((bar) => { bar.style.width = bar.dataset.width; });
  });
}

function fillForm(profile) {
  FIELDS.forEach((f) => {
    form.elements[f].value = profile ? Number(profile[f]) : '';
  });
}

function setUpdated(profile) {
  document.getElementById('profile-updated').textContent = profile
    ? `Last saved ${formatDate(profile.updated_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : '';
}

async function load() {
  renderSkeleton();
  await requireLogin();
  try {
    const { profile, health } = await api('/api/profile');
    fillForm(profile);
    setUpdated(profile);
    if (health) renderScore(health); else renderEmpty();
  } catch (err) {
    card.innerHTML = `<p class="plan-empty">${escapeHtml(err.message)}</p>`;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(form);
  const payload = Object.fromEntries(FIELDS.map((f) => [f, form.elements[f].value.trim()]));
  const missing = FIELDS.find((f) => payload[f] === '');
  if (missing) {
    showFieldError(form, { field: missing, message: 'Please enter an amount (use 0 if none).' });
    return;
  }
  const button = document.getElementById('btn-save-profile');
  setBusy(button, true, 'Calculating...');
  try {
    const { profile, health } = await api('/api/profile', { method: 'PUT', body: payload });
    fillForm(profile);
    setUpdated(profile);
    renderScore(health);
    toast(`Saved. Your financial health score is ${health.score}/100.`, 'success');
    if (window.innerWidth < 980) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    if (!showFieldError(form, err)) toast(err.message, 'error');
  } finally {
    setBusy(button, false);
  }
});

// Live preview while typing (not saved until the button is pressed).
form.addEventListener('input', () => {
  const values = Object.fromEntries(FIELDS.map((f) => [f, form.elements[f].value]));
  if (Number(values.monthly_income) > 0 && FIELDS.every((f) => values[f] !== '' && Number(values[f]) >= 0)) {
    const preview = calculateHealthScore(values);
    const num = document.getElementById('score-number');
    if (num) {
      num.textContent = preview.score;
      num.parentElement.style.setProperty('--score', preview.score);
    }
  }
});

load();
