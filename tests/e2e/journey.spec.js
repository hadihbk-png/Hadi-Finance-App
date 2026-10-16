// The full member journey, start to finish, as a real user would do it.
import { test, expect, signUp, setRange } from './fixtures.js';

test.describe.configure({ mode: 'serial' });

test('a new member builds a complete plan and it is all still there after refreshing', async ({ page }) => {
  test.setTimeout(180000);
  const email = await signUp(page, 'journey', 'Mariam Test');
  const planCard = (label) => page.locator('.plan-card').filter({ has: page.locator('.plan-card__label', { hasText: new RegExp(`^${label}$`) }) });

  // ---- My Plan starts empty --------------------------------------------------
  await expect(page.locator('#plan-greeting')).toHaveText('Welcome back, Mariam');
  await expect(page.locator('#plan-subtitle')).toContainText('0 of 4');
  await expect(planCard('Goals')).toContainText("No goals yet. Let's set your first one!");

  // ---- Financial Health ------------------------------------------------------
  await page.goto('/health-assessment.html');
  await expect(page.locator('#health-scorecard .empty-state')).toContainText('No score yet');
  await page.click('#btn-save-profile');
  await expect(page.locator('.has-error .field-error')).toContainText('Please enter an amount');
  const profile = {
    monthly_income: '32000', monthly_expenses: '17500', monthly_debt_payments: '3200',
    emergency_fund: '85000', total_savings: '40000', total_investments: '210000', total_debt: '95000',
  };
  for (const [k, v] of Object.entries(profile)) await page.fill(`[name="${k}"]`, v);
  await page.click('#btn-save-profile');
  await expect(page.locator('.toast').last()).toContainText('81/100');
  await expect(page.locator('#score-number')).toHaveText('81');
  await expect(page.locator('.category-card')).toHaveCount(4);
  await expect(page.locator('.metric-strip')).toContainText('AED 11,300');

  // Server rejects a negative amount and the message appears next to the field
  await page.fill('[name="total_debt"]', '-5');
  await page.click('#btn-save-profile');
  await expect(page.locator('.has-error .field-error')).toContainText('cannot be negative');
  await page.fill('[name="total_debt"]', '95000');

  // ---- Goals: add two, edit one, achieve one, delete one ---------------------
  await page.goto('/goals.html');
  await expect(page.locator('#goals-cards-list .empty-state')).toContainText("No goals yet. Let's set your first one!");
  await expect(page.locator('#btn-cancel-edit')).toBeHidden();

  const addGoal = async (g) => {
    await page.selectOption('#goal-type-select', g.category);
    await page.fill('#goal-name-input', g.name);
    await page.fill('#goal-target-input', g.target);
    await page.fill('#goal-current-input', g.current);
    await page.fill('#goal-monthly-input', g.monthly);
    await page.fill('#goal-date-input', g.date);
    await page.click('#btn-save-goal');
    await expect(page.locator('.goal-title', { hasText: g.name })).toBeVisible();
  };
  await addGoal({ category: 'Home', name: 'Apartment deposit', target: '450000', current: '120000', monthly: '9000', date: '2030-12-31' });
  await addGoal({ category: 'Travel', name: 'Japan trip', target: '35000', current: '8000', monthly: '2500', date: '2028-06-30' });
  await expect(page.locator('.goal-card')).toHaveCount(2);
  await expect(page.locator('#goals-count-badge')).toHaveText('2 Active');
  const home = page.locator('.goal-card', { hasText: 'Apartment deposit' });
  await expect(home.locator('.suggested-note')).toContainText('37 months');
  await expect(home.locator('.goal-progress-badge')).toHaveText('27%');

  // Validation: target of zero is refused
  await page.fill('#goal-name-input', 'Bad goal');
  await page.fill('#goal-target-input', '0');
  await page.click('#btn-save-goal');
  await expect(page.locator('.has-error .field-error')).toContainText('above zero');
  await page.fill('#goal-name-input', '');
  await page.fill('#goal-target-input', '');

  // Edit
  await home.getByRole('button', { name: 'Edit' }).click();
  await expect(page.locator('#goal-form-title')).toHaveText('Edit Goal');
  await expect(page.locator('#btn-cancel-edit')).toBeVisible();
  await page.fill('#goal-monthly-input', '11000');
  await page.click('#btn-save-goal');
  await expect(page.locator('.toast').last()).toContainText('Goal updated');
  await expect(page.locator('.goal-card', { hasText: 'Apartment deposit' }).locator('.suggested-note')).toContainText('30 months');
  await expect(page.locator('#btn-cancel-edit')).toBeHidden();

  // A third goal to achieve, then delete
  await addGoal({ category: 'Other', name: 'New laptop', target: '6000', current: '5000', monthly: '500', date: '2027-01-31' });
  const laptop = page.locator('.goal-card', { hasText: 'New laptop' });
  await laptop.getByRole('button', { name: 'Mark achieved' }).click();
  await expect(page.locator('.goal-card', { hasText: 'New laptop' }).locator('.status-pill')).toHaveText('Achieved');
  await expect(page.locator('#goals-count-badge')).toHaveText('2 Active · 1 Achieved');
  await page.locator('.goal-card', { hasText: 'New laptop' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.goal-card')).toHaveCount(2);

  // ---- Risk questionnaire, one question at a time ----------------------------
  await page.goto('/risk-assessment.html');
  await expect(page.locator('.history-table')).toHaveCount(0);
  await expect(page.locator('#quiz-step-label')).toHaveText('Question 1 of 10');
  await expect(page.locator('#btn-next-question')).toBeDisabled();
  for (let i = 1; i <= 10; i++) {
    await page.locator('.radio-option').nth(2).click();
    if (i === 3) {
      // Going back keeps the earlier answer selected
      await page.click('#btn-prev-question');
      await expect(page.locator('#quiz-step-label')).toHaveText('Question 2 of 10');
      await expect(page.locator('.radio-option input').nth(2)).toBeChecked();
      await page.click('#btn-next-question');
      await page.locator('.radio-option').nth(2).click();
    }
    await page.click('#btn-next-question');
    if (i < 10) await expect(page.locator('#quiz-step-label')).toHaveText(`Question ${i + 1} of 10`);
  }
  await expect(page.locator('#res-profile-name')).toHaveText('Growth Investor');
  await expect(page.locator('#res-score-number')).toHaveText('67 / 100');
  await expect(page.locator('#res-alloc-bars .alloc-bar-item')).toHaveCount(6);
  await expect(page.locator('.history-table tbody tr')).toHaveCount(1);

  // ---- Investments shows the matching portfolio --------------------------------
  await page.goto('/investment-planning.html');
  await expect(page.locator('#portfolio-card .app-card__title')).toHaveText('Long-Term Growth Portfolio');
  await expect(page.locator('.alloc-legend__item')).toHaveCount(6);
  await expect(page.locator('#readout-inv-return')).toHaveText('7.5%');

  // ---- Retirement --------------------------------------------------------------
  await page.goto('/retirement-planner.html');
  await expect(page.locator('#rp-saved-note')).toContainText('Not saved yet');
  await setRange(page, '#rp-current-age', 38);
  await setRange(page, '#rp-target-age', 60);
  await setRange(page, '#rp-current-savings', 210000);
  await setRange(page, '#rp-monthly-contrib', 4000);
  await setRange(page, '#rp-desired-income', 25000);
  await page.click('#btn-save-retirement');
  await expect(page.locator('.toast').last()).toContainText('Retirement plan saved');
  await expect(page.locator('#rp-readiness-pill')).toHaveText('Off Track');
  await expect(page.locator('#rp-income-gap')).toContainText('more each month');
  await page.reload();
  await expect(page.locator('#readout-rp-current-age')).toHaveText('38 yrs');
  await expect(page.locator('#readout-rp-current-savings')).toHaveText('AED 210,000');
  await expect(page.locator('#rp-saved-note')).toContainText('Saved');

  // ---- Calculators: save one -----------------------------------------------------
  await page.goto('/calculators.html');
  await page.locator('#tab-networth .calc-save-row button').click();
  await expect(page.locator('.toast').last()).toContainText('Calculation saved');

  // ---- Contact: pre-filled, submit ---------------------------------------------
  await page.goto('/contact.html?service=2');
  await expect(page.locator('#contact-name')).toHaveValue('Mariam Test');
  await expect(page.locator('#contact-email')).toHaveValue(email);
  await expect(page.locator('#contact-interest option:checked')).toContainText('Retirement Planning');
  const nextWeek = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  await page.fill('#contact-date', nextWeek);
  await page.fill('#contact-message', 'Please review my retirement gap.');
  await page.click('#btn-submit-consultation');
  await expect(page.locator('#consultation-confirmation')).toBeVisible();
  await expect(page.locator('#receipt-ref')).toHaveText(/^FIN-\d{4}-\d{4,}$/);

  // ---- My Plan shows everything, and it survives a refresh -----------------------
  const checkPlan = async () => {
    await expect(page.locator('#plan-subtitle')).toHaveText('Your plan is complete. Review it regularly as life changes.');
    await expect(planCard('Financial Health').locator('[data-count]')).toHaveText('81');
    await expect(planCard('Risk Profile')).toContainText('Growth');
    await expect(planCard('Retirement')).toContainText('Off Track');
    await expect(planCard('Goals').locator('.plan-goal')).toHaveCount(2);
    await expect(planCard('Recent Calculations')).toContainText('Net Worth');
    await expect(planCard('Consultations')).toContainText('Retirement Planning');
  };
  await page.goto('/my-plan.html');
  await checkPlan();
  await page.reload();
  await checkPlan();
});
