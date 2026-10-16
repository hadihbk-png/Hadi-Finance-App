// What users see when something goes wrong.
import { test, expect, signUp } from './fixtures.js';

test('a database outage shows a clear message instead of a broken page', async ({ page, problems }) => {
  await signUp(page, 'outage');
  await page.route('**/api/goals', (route) => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: "We can't reach the database right now. Please try again in a moment.", code: 'DB_UNAVAILABLE' }),
  }));
  await page.goto('/goals.html');
  await expect(page.locator('.db-banner')).toContainText("We can't reach the database right now");
  await expect(page.locator('#goals-cards-list')).toContainText("We can't reach the database");
  // The simulated 503 is expected here.
  problems.length = 0;
  await page.unroute('**/api/goals');
  await page.locator('.db-banner button').click();
  await expect(page.locator('.db-banner')).toHaveCount(0);
  await expect(page.locator('#goals-cards-list .empty-state')).toBeVisible();
});

test('a lost connection while saving shows an error toast and keeps the form', async ({ page, problems }) => {
  await signUp(page, 'offline');
  await page.goto('/goals.html');
  await page.route('**/api/goals', (route) => (route.request().method() === 'POST' ? route.abort('internetdisconnected') : route.continue()));
  await page.fill('#goal-name-input', 'Offline goal');
  await page.fill('#goal-target-input', '1000');
  await page.click('#btn-save-goal');
  await expect(page.locator('.toast--error')).toContainText("can't reach the FINORA server");
  await expect(page.locator('#goal-name-input')).toHaveValue('Offline goal');
  await expect(page.locator('#btn-save-goal')).toBeEnabled();
  problems.length = 0;
});

test('text that looks like code is shown as plain text, never run', async ({ page }) => {
  await signUp(page, 'xss');
  await page.goto('/goals.html');
  const payload = '<img src=x onerror="window.__xss=1">';
  await page.fill('#goal-name-input', payload);
  await page.fill('#goal-target-input', '1000');
  await page.click('#btn-save-goal');
  await expect(page.locator('.goal-title')).toHaveText(payload);
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
});
