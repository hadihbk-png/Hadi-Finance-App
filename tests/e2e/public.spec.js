// Public pages: load cleanly, show real data, work on desktop and mobile.
import { test, expect, signUp } from './fixtures.js';

const PUBLIC_PAGES = [
  ['/', 'FINORA Financial Advisory'],
  ['/services.html', 'Advisory Practices'],
  ['/insights.html', 'Insights'],
  ['/calculators.html', 'Calculators'],
  ['/about.html', 'About'],
  ['/contact.html', 'Consultation'],
  ['/login.html', 'Log In'],
  ['/signup.html', 'Create Your Account'],
];

const PROTECTED_PAGES = ['/health-assessment.html', '/goals.html', '/risk-assessment.html', '/investment-planning.html', '/retirement-planner.html', '/my-plan.html'];

async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
}

for (const [path, title] of PUBLIC_PAGES) {
  test(`${path} loads with images, footer note and no layout overflow`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(new RegExp(title, 'i'));
    await scrollThrough(page);
    await page.waitForLoadState('networkidle');

    const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    expect(broken, `broken images: ${broken.join(', ')}`).toEqual([]);

    await expect(page.locator('.edu-footer-note')).toHaveText('For educational purposes only. Not regulated financial advice.');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(1);
  });
}

test('home page shows live counters and the Start button goes to sign up', async ({ page }) => {
  await page.goto('/');
  await page.locator('.stats-strip').scrollIntoViewIfNeeded();
  const stats = await page.request.get('/api/stats').then((r) => r.json());
  await expect(page.locator('[data-stat="members"]')).toHaveText(stats.members.toLocaleString('en-US'));
  await expect(page.locator('[data-stat="goals_created"]')).toHaveText(stats.goals_created.toLocaleString('en-US'));
  await expect(page.locator('[data-stat="assessments_completed"]')).toHaveText(stats.assessments_completed.toLocaleString('en-US'));

  const start = page.locator('.header-actions .btn--primary-nav');
  await expect(start).toHaveText('Start Your Plan');
  await expect(start).toHaveAttribute('href', '/signup.html');
});

test('services and insights come from the database', async ({ page }) => {
  await page.goto('/services.html');
  await expect(page.locator('.practice-card')).toHaveCount(6);
  await expect(page.locator('.meta-price').first()).toHaveText('AED 750');

  await page.goto('/insights.html');
  await expect(page.locator('.article-card')).toHaveCount(9);
  await page.locator('.topic-pill', { hasText: 'Investing' }).click();
  await expect(page.locator('.article-card')).toHaveCount(3);
  await page.fill('#insights-search', 'sukuk');
  await expect(page.locator('.article-card')).toHaveCount(1);
  await page.fill('#insights-search', 'zzzz-nothing');
  await expect(page.locator('.empty-state')).toContainText('No articles match');
  await page.fill('#insights-search', '');
  await page.locator('.topic-pill', { hasText: 'All Topics' }).click();
  await page.locator('.article-card a.btn-read-article').first().click();
  await expect(page).toHaveURL(/article\.html\?slug=/);
  await expect(page.locator('.article-body p').first()).toBeVisible();
  await expect(page.locator('.related-card')).toHaveCount(3);
});

test('unknown article shows a friendly not-found message', async ({ page }) => {
  await page.goto('/article.html?slug=this-does-not-exist');
  await expect(page.locator('.empty-state__title')).toHaveText('Article not found');
});

test('calculators work without an account and invite you to log in to save', async ({ page }) => {
  await page.goto('/calculators.html');
  await page.fill('#nw-cash', '100000');
  await expect(page.locator('#nw-total-assets')).toContainText('AED');
  await expect(page.locator('#tab-networth .calc-save-row')).toContainText('Log in');
  await expect(page.locator('#tab-networth .calc-save-row button')).toHaveCount(0);
});

for (const path of PROTECTED_PAGES) {
  test(`${path} redirects to login when logged out`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\.html\\?next=${encodeURIComponent(path).replace(/\./g, '\\.')}`));
  });
}

test('mobile menu opens and navigates', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/services.html');
  await page.click('#mobile-menu-btn');
  const drawer = page.locator('#mobile-nav-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.mobile-account')).toContainText('Start Your Plan');
  await drawer.locator('.mobile-nav-link', { hasText: /^Insights/ }).click();
  await expect(page).toHaveURL(/insights\.html/);
});

test('logged-in pages fit the screen without sideways scrolling', async ({ page }) => {
  await signUp(page, 'layout');
  for (const path of PROTECTED_PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(1);
  }
});
