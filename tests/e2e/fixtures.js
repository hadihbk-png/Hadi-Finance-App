// Shared Playwright fixtures: every test fails on console errors, uncaught
// exceptions, failed requests or 5xx responses, unless the test expects them.
import { test as base, expect } from '@playwright/test';
import crypto from 'node:crypto';

export const PASSWORD = 'Test1234!';
export const e2eEmail = (tag = 'user') => `e2e.${tag}.${crypto.randomBytes(5).toString('hex')}@finora.test`;

// Logged-out pages ask /api/auth/me who is signed in; a 401 there is expected.
const EXPECTED = [/\/api\/auth\/me/];

export const test = base.extend({
  problems: [async ({ page }, use) => {
    const problems = [];
    const allow = (url) => EXPECTED.some((re) => re.test(url));
    page.on('pageerror', (err) => problems.push(`uncaught error: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      // Expected 4xx answers (validation errors, logged-out checks) are tested explicitly.
      if (allow(msg.location()?.url || '') || /responded with a status of 4\d\d/.test(msg.text())) return;
      problems.push(`console error: ${msg.text()} (${msg.location()?.url})`);
    });
    page.on('response', (res) => {
      if (res.status() >= 500) problems.push(`HTTP ${res.status()} ${res.url()}`);
    });
    page.on('requestfailed', (req) => {
      const failure = req.failure()?.errorText || '';
      // Navigating away cancels in-flight requests; that is not a bug.
      if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(failure)) return;
      problems.push(`request failed: ${req.url()} ${failure}`);
    });
    page.on('dialog', (d) => d.accept());
    await use(problems);
    expect(problems, problems.join('\n')).toEqual([]);
  }, { auto: true }],
});

export { expect };

// Creates a new account through the sign-up page and lands on My Plan.
export async function signUp(page, tag = 'user', name = 'Test User') {
  const email = e2eEmail(tag);
  await page.goto('/signup.html');
  await page.fill('#su-name', name);
  await page.fill('#su-email', email);
  await page.fill('#su-password', PASSWORD);
  await page.click('#signup-submit');
  await page.waitForURL(/\/my-plan\.html/);
  return email;
}

export async function logIn(page, email) {
  await page.goto('/login.html');
  await page.fill('#login-email', email);
  await page.fill('#login-password', PASSWORD);
  await page.click('#login-submit');
  await page.waitForURL(/\/my-plan\.html/);
}

// Sets an <input type="range"> the way a user dragging it would.
export function setRange(page, selector, value) {
  return page.$eval(selector, (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, String(value));
}

// Logs out with the header link on desktop, or from the menu drawer on mobile.
export async function logOut(page) {
  const headerLink = page.locator('.header-actions .nav-logout');
  if (await headerLink.isVisible()) {
    await headerLink.click();
  } else {
    await page.click('#mobile-menu-btn');
    await page.click('.nav-logout-mobile');
  }
  await page.waitForURL(/\/$/);
}
