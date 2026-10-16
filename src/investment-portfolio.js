// Investments page: the model portfolio for the user's latest risk profile.
import { api, requireLogin, escapeHtml, formatDate } from './app.js';
import { donutChart, allocationLegend, animateAllocation } from './portfolio-chart.js';

const card = document.getElementById('portfolio-card');

function skeleton() {
  card.innerHTML = `
    <div class="portfolio-card" aria-hidden="true">
      <span class="skeleton skeleton--circle" style="width:240px;height:240px;margin:auto"></span>
      <div><span class="skeleton skeleton--label"></span><span class="skeleton skeleton--title"></span>
      <span class="skeleton skeleton--line"></span><span class="skeleton skeleton--line" style="width:80%"></span>
      <span class="skeleton skeleton--block" style="height:110px;margin-top:1rem"></span></div>
    </div>`;
}

// Sets the growth simulator below to the middle of the portfolio's expected return range.
function applyReturnToSimulator(portfolio) {
  const input = document.getElementById('inv-return');
  if (!input) return;
  const mid = (Number(portfolio.expected_return_min) + Number(portfolio.expected_return_max)) / 2;
  input.value = String(Math.round(mid * 2) / 2);
  document.querySelectorAll('.scenario-btn').forEach((b) => b.classList.remove('active'));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function load() {
  skeleton();
  await requireLogin();
  try {
    const { recommended, assessment, summary } = await api('/api/portfolios');
    if (!recommended) {
      card.innerHTML = `
        <div class="empty-state" style="border:none;padding:1.5rem 1rem;">
          <div class="empty-state__icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3 class="empty-state__title">Find your model portfolio</h3>
          <p class="empty-state__text">Take the 10-question risk profile first. We will then show the mix of equities, fixed income, sukuk, gold, real estate and cash that suits you.</p>
          <a href="/risk-assessment.html" class="btn btn--primary">Take the Risk Questionnaire →</a>
        </div>`;
      return;
    }
    card.innerHTML = `
      <div class="portfolio-card">
        <div>${donutChart(recommended)}</div>
        <div>
          <span class="section-label">YOUR MODEL PORTFOLIO</span>
          <h2 class="app-card__title">${escapeHtml(recommended.name)}</h2>
          <div class="portfolio-meta">
            <span class="status-pill status-pill--positive">${escapeHtml(assessment.risk_profile)} profile</span>
            <span class="status-pill status-pill--neutral">Expected ${Number(recommended.expected_return_min)}% to ${Number(recommended.expected_return_max)}% a year</span>
          </div>
          <p class="box-text">${escapeHtml(recommended.description)}</p>
          <p class="field-hint">${escapeHtml(summary || '')} Based on your assessment of ${formatDate(assessment.created_at)} (score ${assessment.score}/100). <a href="/risk-assessment.html" style="color:var(--gold-primary);font-weight:600">Retake</a></p>
          ${allocationLegend(recommended)}
        </div>
      </div>`;
    animateAllocation(card);
    applyReturnToSimulator(recommended);
  } catch (err) {
    card.innerHTML = `<p class="plan-empty">${escapeHtml(err.message)}</p>`;
  }
}

load();
