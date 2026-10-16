// Goals page: create, edit, delete and complete goals (data from /api/goals).
import './nav.js';
import { api, requireLogin, toast, formatAED, formatDate, escapeHtml, skeletonCards, emptyState, showFieldError, clearFieldErrors, setBusy } from './app.js';
import { goalProgress } from '../shared/finance.js';

const form = document.getElementById('create-goal-form');
const list = document.getElementById('goals-cards-list');
const countBadge = document.getElementById('goals-count-badge');
const editId = document.getElementById('goal-edit-id');
const saveBtn = document.getElementById('btn-save-goal');
const cancelBtn = document.getElementById('btn-cancel-edit');
const formTitle = document.getElementById('goal-form-title');

let goals = [];

const STATUS_LABEL = { active: 'Active', achieved: 'Achieved', paused: 'Paused' };

function monthsUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  return (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
}

function describeMonths(months) {
  if (months === null) return 'Add a monthly contribution';
  if (months === 0) return 'Reached';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${months} months (${y} yr${y === 1 ? '' : 's'}${m ? ` ${m} mo` : ''})`;
}

// ---------------------------------------------------------------------------
// Live preview in the form
// ---------------------------------------------------------------------------
function readForm() {
  return {
    name: form.elements.name.value.trim(),
    category: form.elements.category.value,
    target_amount: form.elements.target_amount.value.trim(),
    current_amount: form.elements.current_amount.value.trim() || '0',
    monthly_contribution: form.elements.monthly_contribution.value.trim() || '0',
    target_date: form.elements.target_date.value || null,
  };
}

function updatePreview() {
  const g = readForm();
  const p = goalProgress(g);
  document.getElementById('preview-gap').textContent = formatAED(p.remaining);
  document.getElementById('preview-months').textContent = Number(g.target_amount) > 0 ? describeMonths(p.monthsToGoal) : '—';
  const left = monthsUntil(g.target_date);
  document.getElementById('preview-suggested').textContent =
    left !== null && left > 0 && p.remaining > 0 ? `${formatAED(Math.ceil(p.remaining / left))} / mo` : '—';
  document.getElementById('preview-progress').textContent = `${p.pct}%`;
}

form.addEventListener('input', updatePreview);

// ---------------------------------------------------------------------------
// Goal list
// ---------------------------------------------------------------------------
function goalCard(g) {
  const p = g.progress;
  const statusPill = g.status === 'achieved'
    ? '<span class="status-pill status-pill--positive">Achieved</span>'
    : g.status === 'paused'
      ? '<span class="status-pill status-pill--neutral">Paused</span>'
      : p.onTrack === false
        ? '<span class="status-pill status-pill--warning">Behind Target Date</span>'
        : '<span class="status-pill status-pill--positive">On Track</span>';

  const actions = [
    g.status !== 'achieved' ? `<button type="button" class="btn--link" data-action="achieve" data-id="${g.id}">Mark achieved</button>` : '',
    g.status === 'active' ? `<button type="button" class="btn--link" data-action="pause" data-id="${g.id}">Pause</button>` : '',
    g.status === 'paused' ? `<button type="button" class="btn--link" data-action="resume" data-id="${g.id}">Resume</button>` : '',
    `<button type="button" class="btn--link" data-action="edit" data-id="${g.id}">Edit</button>`,
    `<button type="button" class="btn--link is-danger" data-action="delete" data-id="${g.id}">Delete</button>`,
  ].join('');

  return `
    <article class="goal-card is-${g.status}">
      <div class="goal-card__header">
        <div>
          <span class="goal-type-tag">${escapeHtml(g.category)}</span>
          <h3 class="goal-title">${escapeHtml(g.name)}</h3>
        </div>
        <span class="goal-progress-badge">${p.pct}%</span>
      </div>

      <div class="progress-bar-track">
        <div class="progress-bar-fill ${g.status === 'achieved' ? 'progress-bar-fill--green' : 'progress-bar-fill--gold'}" style="width:0%" data-width="${p.pct}%"></div>
      </div>

      <div class="goal-metrics-grid">
        <div class="goal-metric"><span class="metric-label">Saved</span><strong class="metric-val text-positive">${formatAED(g.current_amount)}</strong></div>
        <div class="goal-metric"><span class="metric-label">Target</span><strong class="metric-val">${formatAED(g.target_amount)}</strong></div>
        <div class="goal-metric"><span class="metric-label">Monthly</span><strong class="metric-val">${formatAED(g.monthly_contribution)}</strong></div>
        <div class="goal-metric"><span class="metric-label">Target Date</span><strong class="metric-val">${g.target_date ? formatDate(g.target_date, { month: 'short', year: 'numeric' }) : '—'}</strong></div>
      </div>

      <div class="goal-card__footer">
        <span class="suggested-note">${g.status === 'achieved'
          ? 'Congratulations, this goal is complete.'
          : `Months to reach goal: <strong>${escapeHtml(describeMonths(p.monthsToGoal))}</strong>`}</span>
        ${statusPill}
      </div>
      <div class="goal-actions mt-2">${actions}</div>
    </article>`;
}

function render() {
  const active = goals.filter((g) => g.status === 'active').length;
  const achieved = goals.filter((g) => g.status === 'achieved').length;
  countBadge.textContent = `${active} Active${achieved ? ` · ${achieved} Achieved` : ''}`;

  if (!goals.length) {
    list.innerHTML = emptyState({
      title: "No goals yet. Let's set your first one!",
      text: 'A home deposit, school fees, a family trip or an emergency fund. Add it on the left to see your timeline.',
      actionLabel: 'Add My First Goal',
      actionId: 'empty-add-goal',
    });
    document.getElementById('empty-add-goal')?.addEventListener('click', () => form.elements.name.focus());
    return;
  }
  list.innerHTML = goals.map(goalCard).join('');
  requestAnimationFrame(() => list.querySelectorAll('[data-width]').forEach((b) => { b.style.width = b.dataset.width; }));
}

async function load() {
  list.innerHTML = `<div class="skeleton-grid">${skeletonCards(2, { lines: 2 })}</div>`;
  await requireLogin();
  try {
    ({ goals } = await api('/api/goals'));
    render();
  } catch (err) {
    list.innerHTML = `<p class="plan-empty">${escapeHtml(err.message)}</p>`;
    countBadge.textContent = '—';
  }
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------
function resetForm() {
  form.reset();
  editId.value = '';
  saveBtn.textContent = 'Add Goal';
  formTitle.textContent = 'Define a Financial Goal';
  cancelBtn.hidden = true;
  clearFieldErrors(form);
  updatePreview();
}

function startEdit(goal) {
  editId.value = goal.id;
  form.elements.name.value = goal.name;
  form.elements.category.value = goal.category;
  form.elements.target_amount.value = Number(goal.target_amount);
  form.elements.current_amount.value = Number(goal.current_amount);
  form.elements.monthly_contribution.value = Number(goal.monthly_contribution);
  form.elements.target_date.value = goal.target_date || '';
  saveBtn.textContent = 'Save Changes';
  formTitle.textContent = 'Edit Goal';
  cancelBtn.hidden = false;
  updatePreview();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.elements.name.focus({ preventScroll: true });
}

cancelBtn.addEventListener('click', resetForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(form);
  const g = readForm();
  if (!g.name) return showFieldError(form, { field: 'name', message: 'Please give your goal a name.' });
  if (!(Number(g.target_amount) > 0)) return showFieldError(form, { field: 'target_amount', message: 'Please enter a target amount above zero.' });

  const id = editId.value;
  const existing = id ? goals.find((x) => String(x.id) === id) : null;
  if (existing) g.status = existing.status;

  setBusy(saveBtn, true);
  try {
    const { goal } = await api(id ? `/api/goals/${id}` : '/api/goals', { method: id ? 'PUT' : 'POST', body: g });
    goals = id ? goals.map((x) => (x.id === goal.id ? goal : x)) : [goal, ...goals];
    render();
    toast(id ? 'Goal updated.' : `"${goal.name}" added to your goals.`, 'success');
    setBusy(saveBtn, false);
    resetForm();
  } catch (err) {
    setBusy(saveBtn, false);
    if (!showFieldError(form, err)) toast(err.message, 'error');
  }
});

// ---------------------------------------------------------------------------
// Card actions
// ---------------------------------------------------------------------------
list.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const goal = goals.find((g) => String(g.id) === btn.dataset.id);
  if (!goal) return;
  const action = btn.dataset.action;

  if (action === 'edit') return startEdit(goal);

  if (action === 'delete') {
    if (!window.confirm(`Delete "${goal.name}"? This cannot be undone.`)) return;
    btn.disabled = true;
    try {
      await api(`/api/goals/${goal.id}`, { method: 'DELETE' });
      goals = goals.filter((g) => g.id !== goal.id);
      if (editId.value === String(goal.id)) resetForm();
      render();
      toast('Goal deleted.', 'info');
    } catch (err) {
      btn.disabled = false;
      toast(err.message, 'error');
    }
    return;
  }

  const status = { achieve: 'achieved', pause: 'paused', resume: 'active' }[action];
  btn.disabled = true;
  try {
    const { goal: updated } = await api(`/api/goals/${goal.id}`, { method: 'PATCH', body: { status } });
    goals = goals.map((g) => (g.id === updated.id ? updated : g));
    render();
    toast(status === 'achieved' ? `Well done! "${updated.name}" is achieved.` : `Goal ${STATUS_LABEL[status].toLowerCase()}.`, 'success');
  } catch (err) {
    btn.disabled = false;
    toast(err.message, 'error');
  }
});

updatePreview();
load();
