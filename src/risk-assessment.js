// Risk Profile page: one-question-at-a-time questionnaire, result, and history.
import './nav.js';
import { api, requireLogin, toast, formatDate, escapeHtml, setBusy } from './app.js';
import { allocationBars, animateAllocation } from './portfolio-chart.js';

const quizCard = document.getElementById('risk-questionnaire-container');
const resultsCard = document.getElementById('risk-results-card');
const slot = document.getElementById('question-slot');
const stepLabel = document.getElementById('quiz-step-label');
const progressFill = document.getElementById('quiz-progress-fill');
const prevBtn = document.getElementById('btn-prev-question');
const nextBtn = document.getElementById('btn-next-question');
const historyBox = document.getElementById('risk-history');

let questions = [];
let summaries = {};
let answers = {};
let index = 0;

// ---------------------------------------------------------------------------
// Questionnaire
// ---------------------------------------------------------------------------
function showQuestion() {
  const q = questions[index];
  const total = questions.length;
  stepLabel.textContent = `Question ${index + 1} of ${total}`;
  progressFill.style.width = `${(index / total) * 100}%`;

  slot.innerHTML = `
    <div class="question-block">
      <span class="question-num">${index + 1}. Risk Profile</span>
      <h3 class="question-prompt">${escapeHtml(q.question)}</h3>
      <div class="radio-options-list" role="radiogroup">
        ${q.options.map((o, i) => `
          <label class="radio-option">
            <input type="radio" name="q_${q.id}" value="${i}" ${answers[q.id] === i ? 'checked' : ''}>
            <span>${escapeHtml(o.label)}</span>
          </label>`).join('')}
      </div>
    </div>`;

  prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
  nextBtn.textContent = index === total - 1 ? 'See My Risk Profile →' : 'Next Question →';
  nextBtn.className = `btn ${index === total - 1 ? 'btn--gold' : 'btn--primary'}`;
  nextBtn.disabled = answers[q.id] === undefined;
}

slot.addEventListener('change', (e) => {
  if (e.target.type !== 'radio') return;
  answers[questions[index].id] = Number(e.target.value);
  nextBtn.disabled = false;
});

// Double-clicking an option moves straight to the next question.
slot.addEventListener('dblclick', (e) => { if (e.target.closest('.radio-option') && !nextBtn.disabled) nextBtn.click(); });

prevBtn.addEventListener('click', () => {
  if (index > 0) { index -= 1; showQuestion(); }
});

nextBtn.addEventListener('click', async () => {
  if (answers[questions[index].id] === undefined) return;
  if (index < questions.length - 1) {
    index += 1;
    showQuestion();
    return;
  }
  progressFill.style.width = '100%';
  setBusy(nextBtn, true, 'Calculating...');
  try {
    const result = await api('/api/risk', { method: 'POST', body: { answers } });
    showResult(result.assessment, result.portfolio, result.summary);
    toast(`Saved. Your risk profile is ${result.assessment.risk_profile}.`, 'success');
    loadHistory();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(nextBtn, false);
  }
});

function restart() {
  answers = {};
  index = 0;
  resultsCard.hidden = true;
  quizCard.hidden = false;
  showQuestion();
  quizCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('btn-retake-risk').addEventListener('click', restart);

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------
function showResult(assessment, portfolio, summary) {
  quizCard.hidden = true;
  resultsCard.hidden = false;
  document.getElementById('res-profile-name').textContent = `${assessment.risk_profile} Investor`;
  document.getElementById('res-score-number').textContent = `${assessment.score} / 100`;
  document.getElementById('res-profile-explanation').textContent = summary || summaries[assessment.risk_profile] || '';
  if (portfolio) {
    document.getElementById('res-portfolio-name').textContent = `${portfolio.name} · Expected ${Number(portfolio.expected_return_min)}% to ${Number(portfolio.expected_return_max)}% a year`;
    document.getElementById('res-portfolio-desc').textContent = portfolio.description;
    const bars = document.getElementById('res-alloc-bars');
    bars.innerHTML = allocationBars(portfolio);
    animateAllocation(bars);
  }
  resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
function renderHistory(history) {
  if (!history.length) {
    historyBox.innerHTML = `
      <span class="section-label">PAST ASSESSMENTS</span>
      <p class="plan-empty">No assessments yet. Answer the 10 questions above to find your risk profile.</p>`;
    return;
  }
  historyBox.innerHTML = `
    <span class="section-label">PAST ASSESSMENTS</span>
    <h3 class="app-card__title" style="font-size:1.5rem">Your History</h3>
    <table class="history-table">
      <thead><tr><th>Date</th><th>Risk profile</th><th>Score</th></tr></thead>
      <tbody>${history.map((h, i) => `
        <tr>
          <td>${formatDate(h.created_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}${i === 0 ? ' <span class="status-pill status-pill--positive" style="margin-left:0.4rem">Latest</span>' : ''}</td>
          <td><strong>${escapeHtml(h.risk_profile)}</strong></td>
          <td>${h.score} / 100</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function loadHistory() {
  try {
    const data = await api('/api/risk');
    renderHistory(data.history);
  } catch { /* the main load already reported the problem */ }
}

async function load() {
  slot.innerHTML = '<span class="skeleton skeleton--label"></span><span class="skeleton skeleton--title" style="width:80%"></span>' +
    '<span class="skeleton skeleton--block" style="height:56px;margin-bottom:0.7rem"></span>'.repeat(4);
  historyBox.innerHTML = '<span class="skeleton skeleton--label"></span><span class="skeleton skeleton--line"></span><span class="skeleton skeleton--line" style="width:60%"></span>';
  await requireLogin();
  try {
    const data = await api('/api/risk');
    questions = data.questions;
    summaries = data.summaries;
    renderHistory(data.history);
    if (!questions.length) {
      slot.innerHTML = '<p class="plan-empty">The questionnaire is not available yet. Please run "npm run db:setup".</p>';
      return;
    }
    showQuestion();
  } catch (err) {
    slot.innerHTML = `<p class="plan-empty">${escapeHtml(err.message)}</p>`;
    stepLabel.textContent = 'Unavailable';
  }
}

load();
