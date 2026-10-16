// Sign up, log in and log out through the real pages.
import { test, expect, signUp, logOut, e2eEmail, PASSWORD } from './fixtures.js';

test('sign up shows clear errors, then creates the account', async ({ page }) => {
  await page.goto('/signup.html');
  await page.click('#signup-submit');
  await expect(page.locator('.has-error .field-error')).toContainText('Full name is required');

  await page.fill('#su-name', 'Weak Password');
  await page.fill('#su-email', e2eEmail('weak'));
  await page.fill('#su-password', 'short');
  await page.click('#signup-submit');
  await expect(page.locator('.has-error .field-error')).toContainText('at least 8 characters');

  await page.fill('#su-email', 'not-an-email');
  await page.fill('#su-password', PASSWORD);
  await page.click('#signup-submit');
  await expect(page.locator('.has-error .field-error')).toContainText('valid email');

  await page.fill('#su-email', e2eEmail('ok'));
  await page.click('#signup-submit');
  await expect(page).toHaveURL(/my-plan\.html/);
  await expect(page.locator('.toast')).toContainText('Your account is ready');
  await expect(page.locator('.nav-user__name')).toHaveText('Weak');
});

test('duplicate email is refused on sign up', async ({ page, browser }) => {
  const email = await signUp(page, 'dup');
  const other = await browser.newPage();
  await other.goto('/signup.html');
  await other.fill('#su-name', 'Someone Else');
  await other.fill('#su-email', email.toUpperCase());
  await other.fill('#su-password', PASSWORD);
  await other.click('#signup-submit');
  await expect(other.locator('.has-error .field-error')).toContainText('already exists');
  await other.close();
});

test('log in, wrong password, redirect back to the requested page, log out', async ({ page }) => {
  const email = await signUp(page, 'login', 'Omar Haddad');
  await logOut(page);
  await expect(page.locator('.toast')).toContainText('logged out');

  await page.goto('/goals.html');
  await expect(page).toHaveURL(/login\.html\?next=%2Fgoals\.html/);
  await page.fill('#login-email', email);
  await page.fill('#login-password', 'Wrong1234!');
  await page.click('#login-submit');
  await expect(page.locator('#auth-error')).toHaveText('Incorrect email or password.');

  await page.fill('#login-password', PASSWORD);
  await page.click('#login-submit');
  await expect(page).toHaveURL(/goals\.html$/);
  await expect(page.locator('.header-actions .btn--primary-nav')).toHaveText('My Plan');

  // Visiting login while logged in goes straight to My Plan.
  await page.goto('/login.html');
  await expect(page).toHaveURL(/my-plan\.html/);
});

test('login ignores redirects to other websites', async ({ page }) => {
  const email = await signUp(page, 'redirect');
  await page.context().clearCookies();
  await page.goto('/login.html?next=//evil.example.com');
  await page.fill('#login-email', email);
  await page.fill('#login-password', PASSWORD);
  await page.click('#login-submit');
  await expect(page).toHaveURL(/localhost:\d+\/my-plan\.html/);
});

test('session survives a page refresh and a new tab', async ({ page, context }) => {
  await signUp(page, 'session', 'Sara Test');
  await page.reload();
  await expect(page.locator('#plan-greeting')).toHaveText('Welcome back, Sara');
  const tab = await context.newPage();
  await tab.goto('/goals.html');
  await expect(tab).toHaveURL(/goals\.html/);
  await tab.close();
});

