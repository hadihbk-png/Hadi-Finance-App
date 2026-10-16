// Log in & sign up pages
import './nav.js';
import { api, currentUser, flashToast, showFieldError, clearFieldErrors, setBusy } from './app.js';

// Only allow redirects back to pages on this site.
function nextUrl() {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/my-plan.html';
}

function showError(message) {
  const box = document.getElementById('auth-error');
  box.textContent = message;
  box.classList.add('visible');
}

function hideError() {
  document.getElementById('auth-error').classList.remove('visible');
}

async function handleSubmit(form, endpoint, button, busyLabel, successMessage) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    clearFieldErrors(form);
    const payload = Object.fromEntries(new FormData(form).entries());
    setBusy(button, true, busyLabel);
    try {
      await api(endpoint, { method: 'POST', body: payload, quiet: true });
      flashToast(successMessage, 'success');
      window.location.href = nextUrl();
    } catch (err) {
      if (!showFieldError(form, err)) showError(err.message);
      setBusy(button, false);
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Keep the redirect target when switching between log in and sign up.
  const next = new URLSearchParams(window.location.search).get('next');
  const switchLink = document.getElementById('switch-link');
  if (next && switchLink) switchLink.href += `?next=${encodeURIComponent(next)}`;

  if (await currentUser()) {
    window.location.replace(nextUrl());
    return;
  }

  const login = document.getElementById('login-form');
  if (login) {
    handleSubmit(login, '/api/auth/login', document.getElementById('login-submit'), 'Logging in...', 'Welcome back!');
  }

  const signup = document.getElementById('signup-form');
  if (signup) {
    handleSubmit(signup, '/api/auth/signup', document.getElementById('signup-submit'), 'Creating your account...', 'Your account is ready.');
  }
});
