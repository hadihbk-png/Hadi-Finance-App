// FINORA - shared app layer for every page:
// API calls, login state in the navbar, page protection, toasts, skeletons,
// empty states, animated counters and the footer educational note.

import './app.css';
import { formatAED } from './currency.js';

export { formatAED };

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message);
    this.status = status;
    this.field = data.field;
    this.code = data.code;
  }
}

export async function api(path, { method = 'GET', body, quiet = false } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    showConnectionBanner("We can't reach the FINORA server. Check that the app is running and try again.");
    throw new ApiError("We can't reach the FINORA server right now.", 0, { code: 'NETWORK' });
  }

  let data = {};
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }

  if (res.ok) {
    hideConnectionBanner();
    return data;
  }

  const message = data.error || 'Something went wrong. Please try again.';
  if (res.status === 503 || res.status === 502 || res.status === 504) {
    showConnectionBanner(res.status === 503 ? message : "We can't reach the FINORA server right now.");
  } else if (res.status === 401 && data.code === 'AUTH_REQUIRED' && document.body.dataset.auth === 'required') {
    window.location.href = loginUrl();
  } else if (!quiet && res.status >= 500) {
    toast(message, 'error');
  }
  throw new ApiError(message, res.status, data);
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
let userPromise = null;

export function currentUser() {
  if (!userPromise) {
    userPromise = api('/api/auth/me', { quiet: true })
      .then((d) => d.user)
      .catch(() => null);
  }
  return userPromise;
}

export function loginUrl() {
  const next = window.location.pathname + window.location.search;
  return `/login.html?next=${encodeURIComponent(next)}`;
}

// Resolves with the user, or redirects to login.
export async function requireLogin() {
  const user = await currentUser();
  if (!user) {
    window.location.replace(loginUrl());
    return new Promise(() => {}); // never resolves; the page is navigating away
  }
  return user;
}

export async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* still leave */ }
  flashToast('You have been logged out.', 'info');
  window.location.href = '/';
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
function renderNav(user) {
  const actions = document.querySelector('.header-actions');
  const startBtn = document.querySelector('.header-actions .btn--primary-nav');
  if (startBtn) {
    startBtn.textContent = user ? 'My Plan' : 'Start Your Plan';
    startBtn.href = user ? '/my-plan.html' : '/signup.html';
  }

  if (actions) {
    actions.querySelector('.nav-account')?.remove();
    const wrap = document.createElement('div');
    wrap.className = 'nav-account';
    if (user) {
      wrap.innerHTML = `
        <a href="/my-plan.html" class="nav-user" title="My Plan">
          <span class="nav-user__avatar" aria-hidden="true">${escapeHtml(user.first_name.charAt(0).toUpperCase())}</span>
          <span class="nav-user__name">${escapeHtml(user.first_name)}</span>
        </a>
        <button type="button" class="nav-logout">Log out</button>`;
    } else {
      wrap.innerHTML = '<a href="/login.html" class="nav-login">Log in</a>';
    }
    actions.insertBefore(wrap, actions.firstChild);
    wrap.querySelector('.nav-logout')?.addEventListener('click', logout);
  }

  // Mobile drawer
  const drawer = document.querySelector('.mobile-nav-content');
  if (drawer) {
    drawer.querySelector('.mobile-account')?.remove();
    const box = document.createElement('div');
    box.className = 'mobile-account';
    box.innerHTML = user
      ? `<span class="mobile-account__name">Signed in as <strong>${escapeHtml(user.full_name)}</strong></span>
         <a href="/my-plan.html" class="btn btn--primary btn--full">My Plan</a>
         <button type="button" class="btn btn--secondary btn--full nav-logout-mobile">Log out</button>`
      : `<a href="/signup.html" class="btn btn--primary btn--full">Start Your Plan</a>
         <a href="/login.html" class="btn btn--secondary btn--full">Log in</a>`;
    drawer.appendChild(box);
    box.querySelector('.nav-logout-mobile')?.addEventListener('click', logout);
    drawer.querySelectorAll('.mobile-nav-actions .btn--primary').forEach((b) => {
      b.textContent = user ? 'My Plan' : 'Start Your Plan';
      b.href = user ? '/my-plan.html' : '/signup.html';
    });
  }
}

function addFooterNote() {
  const target = document.querySelector('.footer-bottom-row, .footer-bottom');
  if (!target || target.querySelector('.edu-footer-note')) return;
  const p = document.createElement('p');
  p.className = 'edu-footer-note';
  p.textContent = 'For educational purposes only. Not regulated financial advice.';
  target.appendChild(p);
}

// ---------------------------------------------------------------------------
// Toasts & connection banner
// ---------------------------------------------------------------------------
const ICONS = {
  success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
  error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

export function toast(message, type = 'success', ms = 4200) {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('role', 'status');
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.innerHTML = `<span class="toast__icon">${ICONS[type] || ICONS.info}</span><span>${escapeHtml(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 260);
  }, ms);
}

// Shows a toast on the next page load (for messages right before a redirect).
export function flashToast(message, type = 'success') {
  try { sessionStorage.setItem('finora_flash', JSON.stringify({ message, type })); } catch { /* storage unavailable */ }
}

function showFlashToast() {
  try {
    const raw = sessionStorage.getItem('finora_flash');
    if (!raw) return;
    sessionStorage.removeItem('finora_flash');
    const { message, type } = JSON.parse(raw);
    toast(message, type);
  } catch { /* storage unavailable */ }
}

function showConnectionBanner(message) {
  let banner = document.querySelector('.db-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'db-banner';
    banner.setAttribute('role', 'alert');
    document.body.appendChild(banner);
  }
  banner.innerHTML = `<span><strong>Connection problem.</strong> ${escapeHtml(message)}</span>
    <button type="button">Retry</button>`;
  banner.querySelector('button').addEventListener('click', () => window.location.reload());
}

function hideConnectionBanner() {
  document.querySelector('.db-banner')?.remove();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[c]));
}

export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return d.toLocaleDateString('en-GB', opts);
}

export function skeletonCards(count = 3, { lines = 3, block = false } = {}) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <span class="skeleton skeleton--label"></span>
      <span class="skeleton skeleton--title"></span>
      ${block ? '<span class="skeleton skeleton--block"></span>' : ''}
      ${Array.from({ length: lines }, (_, i) => `<span class="skeleton skeleton--line" style="width:${92 - i * 14}%"></span>`).join('')}
    </div>`).join('');
}

export function emptyState({ title, text, actionLabel, actionHref, actionId }) {
  const action = actionLabel
    ? (actionHref
      ? `<a href="${actionHref}" class="btn btn--primary">${escapeHtml(actionLabel)}</a>`
      : `<button type="button" class="btn btn--primary" ${actionId ? `id="${actionId}"` : ''}>${escapeHtml(actionLabel)}</button>`)
    : '';
  return `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      </div>
      <h3 class="empty-state__title">${escapeHtml(title)}</h3>
      <p class="empty-state__text">${escapeHtml(text)}</p>
      ${action}
    </div>`;
}

export function animateCount(el, to, { duration = 1400, format = (n) => Math.round(n).toLocaleString('en-US') } = {}) {
  const target = Number(to) || 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = format(target);
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(target * eased);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Shows a server validation error next to the matching field (by data-field or name).
export function showFieldError(form, err) {
  clearFieldErrors(form);
  if (!err.field) return false;
  const input = form.querySelector(`[name="${err.field}"]`);
  if (!input) return false;
  const group = input.closest('.form-group') || input.parentElement;
  group.classList.add('has-error');
  let msg = group.querySelector('.field-error');
  if (!msg) {
    msg = document.createElement('span');
    msg.className = 'field-error';
    group.appendChild(msg);
  }
  msg.textContent = err.message;
  input.focus();
  return true;
}

export function clearFieldErrors(form) {
  form.querySelectorAll('.has-error').forEach((g) => g.classList.remove('has-error'));
}

export function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label || 'Saving...';
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function boot() {
  addFooterNote();
  showFlashToast();
  if (document.body.dataset.auth === 'required') requireLogin();
  currentUser().then(renderNav);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
