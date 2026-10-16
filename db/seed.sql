-- FINORA sample data
-- Safe to run repeatedly: rows are matched on a unique key and updated, never duplicated.

-- ---------------------------------------------------------------------------
-- Risk questionnaire (10 questions, 1-4 points per answer)
-- ---------------------------------------------------------------------------
INSERT INTO risk_questions (order_index, question, options) VALUES
(1, 'When do you expect to start withdrawing a significant part of this money?',
 '[{"label":"Within 2 years","points":1},{"label":"In 2 to 5 years","points":2},{"label":"In 5 to 10 years","points":3},{"label":"More than 10 years from now","points":4}]'),
(2, 'How would you describe your investment experience?',
 '[{"label":"None. I have only used bank savings and deposits","points":1},{"label":"Some. I have held mutual funds or a workplace savings plan","points":2},{"label":"Good. I have invested in shares, sukuk or funds for several years","points":3},{"label":"Extensive. I actively manage a diversified portfolio","points":4}]'),
(3, 'How stable is your main source of income over the next 3 to 5 years?',
 '[{"label":"Uncertain. My contract or business income could change at short notice","points":1},{"label":"Somewhat stable, but depends on bonuses or commission","points":2},{"label":"Stable salaried employment","points":3},{"label":"Very secure, with more than one reliable income source","points":4}]'),
(4, 'How many months of expenses do you hold in cash, outside your investments?',
 '[{"label":"Less than 1 month","points":1},{"label":"1 to 3 months","points":2},{"label":"3 to 6 months","points":3},{"label":"More than 6 months","points":4}]'),
(5, 'Your portfolio falls 20% in six months. What do you do?',
 '[{"label":"Sell everything to stop further losses","points":1},{"label":"Sell some to reduce risk","points":2},{"label":"Hold and wait for a recovery","points":3},{"label":"Invest more while prices are lower","points":4}]'),
(6, 'What is your main goal for this money?',
 '[{"label":"Protect what I have, even if growth is low","points":1},{"label":"Steady income with a little growth","points":2},{"label":"A balance of growth and stability","points":3},{"label":"Maximum long-term growth","points":4}]'),
(7, 'Which yearly range of outcomes would you be most comfortable with?',
 '[{"label":"Best year +5%, worst year -2%","points":1},{"label":"Best year +10%, worst year -7%","points":2},{"label":"Best year +18%, worst year -14%","points":3},{"label":"Best year +30%, worst year -25%","points":4}]'),
(8, 'Will you need more than 10% of this money for a large expense (school fees, a home deposit) in the next 2 years?',
 '[{"label":"Yes, definitely","points":1},{"label":"Probably","points":2},{"label":"Unlikely","points":3},{"label":"No","points":4}]'),
(9, 'If this investment lost value for several years, how would your lifestyle be affected?',
 '[{"label":"Seriously. I rely on it for living costs","points":1},{"label":"Noticeably. I would cut back on important plans","points":2},{"label":"Slightly. I would delay some extras","points":3},{"label":"Not at all","points":4}]'),
(10, 'How do you feel about financial risk in general?',
 '[{"label":"I avoid it wherever possible","points":1},{"label":"I accept a little risk for a little more return","points":2},{"label":"I am comfortable with moderate risk","points":3},{"label":"I actively seek higher risk for higher return","points":4}]')
ON CONFLICT (order_index) DO UPDATE
  SET question = EXCLUDED.question, options = EXCLUDED.options;

-- ---------------------------------------------------------------------------
-- Model portfolios (one per risk profile, allocations add up to 100%)
-- ---------------------------------------------------------------------------
INSERT INTO model_portfolios (risk_profile, name, equities_pct, fixed_income_pct, sukuk_pct, gold_pct, real_estate_pct, cash_pct, expected_return_min, expected_return_max, description) VALUES
('Conservative', 'Capital Preservation Portfolio', 15, 30, 25, 5, 5, 20, 3.50, 5.00,
 'Focused on protecting your capital. Most of the portfolio sits in high-quality bonds, sukuk and cash, with a small share in global equities to help keep pace with inflation.'),
('Moderate', 'Income & Stability Portfolio', 30, 25, 20, 7, 8, 10, 4.50, 6.00,
 'A steady, income-focused mix. Bonds and sukuk provide regular income while a measured equity share adds long-term growth.'),
('Balanced', 'Balanced Growth Portfolio', 45, 18, 15, 7, 10, 5, 5.50, 7.50,
 'An even balance between growth and stability. Suited to investors with a medium to long horizon who can accept moderate ups and downs.'),
('Growth', 'Long-Term Growth Portfolio', 60, 10, 10, 6, 11, 3, 6.50, 8.50,
 'Built for long-term wealth creation. Equities lead the portfolio, supported by real estate and gold for diversification.'),
('Aggressive', 'Maximum Growth Portfolio', 75, 5, 5, 5, 8, 2, 7.50, 10.00,
 'Designed for the highest long-term growth potential. Expect large swings in value from year to year. Best suited to horizons of 10 years or more.')
ON CONFLICT (risk_profile) DO UPDATE SET
  name = EXCLUDED.name, equities_pct = EXCLUDED.equities_pct, fixed_income_pct = EXCLUDED.fixed_income_pct,
  sukuk_pct = EXCLUDED.sukuk_pct, gold_pct = EXCLUDED.gold_pct, real_estate_pct = EXCLUDED.real_estate_pct,
  cash_pct = EXCLUDED.cash_pct, expected_return_min = EXCLUDED.expected_return_min,
  expected_return_max = EXCLUDED.expected_return_max, description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- Services (prices in AED)
-- ---------------------------------------------------------------------------
INSERT INTO services (order_index, name, short_description, details, starting_price, duration_minutes) VALUES
(1, 'Financial Health Check',
 'A clear, structured review of your income, spending, savings and debt, with a written summary of where you stand today.',
 'Review of monthly cash flow and savings rate
Emergency fund and liquidity assessment
Debt-to-income and credit card review
Written summary with your top three priorities',
 750.00, 60),
(2, 'Retirement Planning',
 'Model how much you need to retire comfortably, in the UAE or back home, and the monthly saving required to get there.',
 'Retirement income target in today''s AED
Projection of savings and end-of-service gratuity
Gap analysis and required monthly contribution
Review of retirement visa and relocation considerations',
 1500.00, 90),
(3, 'Investment Advisory',
 'An independent view of how your money is invested, matched to your risk profile and time horizon.',
 'Risk profile assessment and model portfolio
Review of existing funds, sukuk and fees
Diversification across equities, fixed income, gold and property
Rebalancing guidelines you can follow on your own',
 1800.00, 90),
(4, 'Goal Planning',
 'Turn goals like a home deposit, school fees or a family trip into a dated plan with a monthly savings target.',
 'Prioritisation of short, medium and long-term goals
Target amounts adjusted for inflation
Monthly savings schedule for each goal
Quarterly progress check-in template',
 950.00, 60),
(5, 'Debt Management',
 'A practical plan to reduce credit card and personal loan balances and lower the interest you pay.',
 'Full list of debts, rates and minimum payments
Avalanche vs snowball repayment comparison
Guidance on balance transfers and loan consolidation
Steps to protect and improve your AECB credit score',
 650.00, 60),
(6, 'Wealth Review',
 'A comprehensive annual review of your whole balance sheet for established families and professionals.',
 'Net worth statement and asset allocation review
Property, gold and business interest assessment
Estate planning and will registration checklist (DIFC / ADGM)
Annual action plan with follow-up session',
 2500.00, 120)
ON CONFLICT (name) DO UPDATE SET
  short_description = EXCLUDED.short_description, details = EXCLUDED.details,
  starting_price = EXCLUDED.starting_price, duration_minutes = EXCLUDED.duration_minutes,
  order_index = EXCLUDED.order_index;

-- ---------------------------------------------------------------------------
-- Insight articles (UAE focused, 4 categories)
-- ---------------------------------------------------------------------------
INSERT INTO insights (slug, title, category, summary, author, read_minutes, image_url, published_at, body) VALUES
('emergency-fund-uae', 'Building an Emergency Fund in the UAE', 'Saving & Budgeting',
 'Why expats in the UAE need a larger cash buffer than most, how much to keep, and where to hold it.',
 'FINORA Planning Team', 5, 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=700&fit=crop', '2026-09-02 09:00:00+04',
$b$<p>An emergency fund is money set aside for the unexpected: a job loss, a medical bill or an urgent flight home. It is not an investment. Its job is to be there, in full, on the day you need it.</p>
<h3>Why the UAE calls for a bigger buffer</h3>
<p>For most expatriate residents, residency is linked to employment. If a job ends, there is a limited grace period to find new work or arrange to leave, and during that time rent, school fees and living costs continue. Many people also need to cover flights, shipping and deposits at short notice. That makes a strong cash reserve more important here than in countries with state unemployment support.</p>
<h3>How much is enough?</h3>
<ul>
<li><strong>3 months</strong> of essential expenses is the minimum for a dual-income household with stable jobs.</li>
<li><strong>6 months</strong> is a sensible target for most single-income families.</li>
<li><strong>9 to 12 months</strong> suits business owners, commission earners and anyone on a short contract.</li>
</ul>
<p>Base the figure on essential costs: rent, utilities, school fees, groceries, insurance and loan payments. For a family spending AED 18,000 a month on essentials, six months means AED 108,000.</p>
<h3>Where to keep it</h3>
<p>Keep the fund in a separate savings account or fixed deposit you can access within a few days. Avoid holding it in shares or crypto, where its value could fall exactly when you need it.</p>
<h3>Building it step by step</h3>
<p>Set up an automatic transfer on salary day, even if it is only AED 1,000 to start. Add part of any bonus. Once you reach your target, redirect the monthly transfer towards your longer-term goals.</p>$b$),

('budgeting-on-a-uae-salary', 'The 50/30/20 Rule, Adapted for UAE Salaries', 'Saving & Budgeting',
 'A simple budgeting framework, adjusted for high rents, school fees and tax-free income.',
 'FINORA Planning Team', 6, '/images/family-planning.jpg', '2026-08-18 09:00:00+04',
$b$<p>The 50/30/20 rule splits take-home pay into three buckets: 50% for needs, 30% for wants and 20% for savings. It is a useful starting point, but UAE households often need to adjust it.</p>
<h3>Why the classic split rarely fits</h3>
<p>Rent in Dubai and Abu Dhabi can take 30 to 40% of income on its own, and private school fees add a large fixed cost for families. On the other hand, there is no income tax on salaries, so a higher savings rate is often realistic.</p>
<h3>A UAE-friendly version</h3>
<ul>
<li><strong>Needs: 50 to 55%</strong> covering rent, utilities, school fees, groceries, transport, insurance and minimum loan payments.</li>
<li><strong>Wants: 20 to 25%</strong> covering dining out, travel, shopping and subscriptions.</li>
<li><strong>Savings and investing: 25% or more</strong> going to your emergency fund, goals and long-term investments.</li>
</ul>
<h3>Watch the lifestyle creep</h3>
<p>Salary increases and housing allowances often disappear into a bigger apartment or a newer car. A simple rule: save at least half of every pay rise before adjusting your lifestyle.</p>
<h3>Make it automatic</h3>
<p>Schedule transfers to savings on salary day so the money leaves your current account before it can be spent. Review your budget each quarter, and after any change in rent or school fees.</p>$b$),

('compound-growth-start-early', 'Compound Growth: Why Starting Early Matters', 'Investing',
 'How AED 1,000 a month can grow to around AED 1 million, and what waiting ten years really costs.',
 'FINORA Research Desk', 5, 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=700&fit=crop', '2026-08-05 09:00:00+04',
$b$<p>Compound growth means your returns start earning returns of their own. Over long periods, the growth on your growth can become larger than everything you put in.</p>
<h3>A simple example</h3>
<p>Suppose you invest AED 1,000 every month and earn an average of 6% a year.</p>
<ul>
<li><strong>After 30 years</strong> you would have contributed AED 360,000, and the portfolio could be worth around <strong>AED 1,004,000</strong>.</li>
<li><strong>Start 10 years later</strong> and invest for 20 years instead: you contribute AED 240,000, and the portfolio could be worth around <strong>AED 462,000</strong>.</li>
</ul>
<p>The ten-year delay cuts contributions by a third, but cuts the final value by more than half. Time does most of the work.</p>
<h3>The Rule of 72</h3>
<p>Divide 72 by your expected annual return to estimate how long money takes to double. At 6%, money doubles roughly every 12 years. At 8%, roughly every 9 years.</p>
<h3>What stops compounding</h3>
<ul>
<li>Withdrawing early or selling during market falls</li>
<li>High fees. A 2% annual fee can consume a large share of long-term growth.</li>
<li>Holding long-term money in cash, where inflation erodes it</li>
</ul>
<p>Returns are never guaranteed, and real portfolios rise and fall. But the earlier and more consistently you invest, the more time compounding has to work.</p>$b$),

('sukuk-explained', 'Sukuk Explained: Sharia-Compliant Fixed Income', 'Investing',
 'What sukuk are, how they differ from conventional bonds, and the role they can play in a portfolio.',
 'FINORA Research Desk', 6, 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=1200&h=700&fit=crop', '2026-07-21 09:00:00+04',
$b$<p>Sukuk are often called Islamic bonds. They pay regular income and return your capital at maturity, but they are structured to comply with Sharia principles, which prohibit interest.</p>
<h3>How sukuk work</h3>
<p>Instead of lending money and receiving interest, sukuk holders own a share of a real asset or business activity, such as a building, equipment or a leasing contract. The regular payments come from the profit or rent that asset produces.</p>
<h3>Sukuk vs conventional bonds</h3>
<ul>
<li><strong>Bonds</strong> are a debt: the issuer owes you interest and principal.</li>
<li><strong>Sukuk</strong> represent ownership in underlying assets, and returns come from those assets.</li>
<li>Both are rated by credit agencies, and both carry credit risk and interest rate sensitivity.</li>
</ul>
<h3>Why they matter in the region</h3>
<p>The GCC is one of the largest sukuk markets in the world, with issues from governments, banks and major companies. For UAE residents, sukuk can provide steady income in a Sharia-compliant form, often in dirhams or US dollars, which avoids currency risk because the dirham is pegged to the dollar.</p>
<h3>Points to consider</h3>
<ul>
<li>Check the issuer's credit quality, not just the headline profit rate.</li>
<li>Prices fall when market rates rise, so expect some movement in value.</li>
<li>Sukuk funds offer diversification for smaller amounts.</li>
</ul>$b$),

('gold-in-your-portfolio', 'Gold in a Diversified Portfolio', 'Investing',
 'From the Dubai Gold Souk to gold funds: how much gold makes sense, and the best ways to hold it.',
 'FINORA Research Desk', 5, 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=700&fit=crop', '2026-07-08 09:00:00+04',
$b$<p>Gold has a special place in UAE households. It is a gift, a store of value and, for many, a symbol of security. But how does it fit within a modern investment plan?</p>
<h3>What gold does well</h3>
<ul>
<li>It has often held its value during periods of market stress and high inflation.</li>
<li>It tends to move differently from shares and bonds, which helps diversification.</li>
<li>It cannot default the way a company or borrower can.</li>
</ul>
<h3>What gold does not do</h3>
<p>Gold produces no income: no dividends, rent or profit payments. Over long periods its growth has generally lagged equities, and it can go through years of flat or falling prices.</p>
<h3>How much?</h3>
<p>Many diversified portfolios hold between 5% and 10% in gold. FINORA model portfolios range from 5% to 7%.</p>
<h3>Ways to hold it</h3>
<ul>
<li><strong>Jewellery:</strong> meaningful, but making charges mean you rarely get the full value back when selling.</li>
<li><strong>Bars and coins:</strong> lower premiums than jewellery, but you need safe storage and insurance.</li>
<li><strong>Gold funds and ETFs:</strong> easy to buy and sell, with no storage concerns, though annual fees apply.</li>
<li><strong>Digital gold through banks:</strong> convenient for small regular purchases. Check the spread and fees.</li>
</ul>$b$),

('end-of-service-gratuity', 'Understanding Your End-of-Service Gratuity', 'Retirement',
 'How gratuity is calculated under UAE labour law, and why it should not be your whole retirement plan.',
 'FINORA Retirement Desk', 6, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=700&fit=crop', '2026-06-24 09:00:00+04',
$b$<p>Most private-sector employees in the UAE are entitled to an end-of-service gratuity when they leave a job after at least one year of continuous service. For many expatriates it is the closest thing to a pension.</p>
<h3>How it is calculated</h3>
<p>Under the UAE Labour Law for the private sector, gratuity is based on your <strong>basic salary</strong>, not your total package:</p>
<ul>
<li><strong>21 days</strong> of basic salary for each of the first five years of service</li>
<li><strong>30 days</strong> of basic salary for each year after that</li>
<li>The total is capped at two years' wages.</li>
</ul>
<p>Example: with a basic salary of AED 15,000 and 8 years of service, the daily rate is about AED 493. Gratuity would be roughly 5 × 21 × 493 plus 3 × 30 × 493, which is around AED 96,000.</p>
<h3>Different schemes</h3>
<p>Employees in the DIFC are covered by the DEWS workplace savings plan instead of a lump-sum gratuity. Some private-sector employers have also joined the voluntary alternative end-of-service savings scheme, where contributions are invested during employment. Check which applies to you.</p>
<h3>Why it is not enough</h3>
<p>Because gratuity is based on basic salary, often only half of the total package, it usually covers a few years of retirement at most. Treat it as a useful boost, and build separate long-term savings alongside it.</p>
<p><em>Rules can change, and free zones may differ. Confirm the details with your employer or HR before relying on any figure.</em></p>$b$),

('retiring-as-a-uae-expat', 'Planning for Retirement as a UAE Expat', 'Retirement',
 'No state pension, rising life expectancy and the question of where to retire: building a plan that works.',
 'FINORA Retirement Desk', 7, '/images/office-lounge.jpg', '2026-06-10 09:00:00+04',
$b$<p>UAE nationals contribute to a state pension, but most expatriate residents do not have one. That puts the responsibility for retirement squarely on personal savings.</p>
<h3>Step 1: Decide where you will retire</h3>
<p>Retiring in the UAE, your home country or somewhere new can change the cost of living, healthcare and tax position dramatically. The UAE offers a retirement visa for residents aged 55 and above who meet financial criteria, such as savings, property or a minimum retirement income. Confirm the current conditions before relying on them.</p>
<h3>Step 2: Set an income target</h3>
<p>Estimate the monthly income you would need in today's money. Many people aim for 60 to 80% of their pre-retirement spending, but include healthcare and travel to see family.</p>
<h3>Step 3: Work out the gap</h3>
<p>Project your current savings, your gratuity and any home-country pension forward to your retirement age. Compare the result with the capital needed to fund your income target for 25 to 30 years.</p>
<h3>Step 4: Close the gap</h3>
<ul>
<li>Increase your monthly contribution, even modestly. Time multiplies small amounts.</li>
<li>Review your investment mix so long-term money is not sitting idle in cash.</li>
<li>Consider working a few years longer, or a phased retirement.</li>
</ul>
<p>The FINORA Retirement Planner runs these numbers for you and shows the monthly amount needed to stay on track.</p>$b$),

('rent-or-buy-in-dubai', 'Renting vs Buying a Home in Dubai', 'Property & Debt',
 'Deposits, fees and break-even years: a clear framework for one of the biggest decisions UAE residents make.',
 'FINORA Planning Team', 7, '/images/hero-bg.jpg', '2026-05-27 09:00:00+04',
$b$<p>Buying a home can build long-term wealth and stability, but it ties up a large amount of capital and carries significant upfront costs. The right answer depends on your plans as much as on the numbers.</p>
<h3>The upfront cost of buying</h3>
<p>Beyond the deposit, budget for:</p>
<ul>
<li>Dubai Land Department transfer fee: 4% of the price</li>
<li>Agency commission: typically 2%</li>
<li>Mortgage registration and bank arrangement fees</li>
<li>Valuation, trustee and conveyancing costs</li>
</ul>
<p>For a first home, UAE Central Bank rules typically require expatriates to put down at least 20% on properties up to AED 5 million, and more above that. On a AED 2 million apartment, you may need around AED 550,000 to 600,000 in cash once fees are included.</p>
<h3>When buying tends to make sense</h3>
<ul>
<li>You plan to stay at least five to seven years.</li>
<li>Your job and income are stable.</li>
<li>Your emergency fund stays intact after the purchase.</li>
<li>The monthly mortgage, service charges and maintenance are comparable to your rent.</li>
</ul>
<h3>When renting is the smarter choice</h3>
<p>If you may relocate within a few years, transaction costs can wipe out any price gains. Renting keeps you flexible, and the deposit money can be invested for growth instead.</p>$b$),

('managing-credit-card-debt', 'Managing Credit Card Debt in the UAE', 'Property & Debt',
 'Why card debt is so expensive, how to pay it down efficiently, and how to protect your AECB credit score.',
 'FINORA Planning Team', 5, 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=700&fit=crop', '2026-05-13 09:00:00+04',
$b$<p>Credit cards are convenient, but carrying a balance is one of the most expensive forms of borrowing. Monthly rates of 2 to 3.5% add up to well over 30% a year.</p>
<h3>Paying only the minimum</h3>
<p>Minimum payments are designed to keep you in debt. On a AED 30,000 balance, paying only the minimum could take many years to clear and cost tens of thousands of dirhams in interest.</p>
<h3>Two proven repayment methods</h3>
<ul>
<li><strong>Avalanche:</strong> pay the minimum on every card, then put every extra dirham towards the card with the highest rate. This saves the most money.</li>
<li><strong>Snowball:</strong> clear the smallest balance first for a quick win, then roll that payment into the next. This builds momentum.</li>
</ul>
<h3>Options worth exploring</h3>
<ul>
<li>A balance transfer or instalment plan at a lower rate. Read the fees carefully.</li>
<li>A personal loan to consolidate card debt at a lower rate, but only if you stop using the cards.</li>
</ul>
<h3>Protect your credit score</h3>
<p>The Al Etihad Credit Bureau (AECB) score ranges from 300 to 900 and affects loan approvals and rates. Pay on time, keep card usage well below your limits, and avoid applying for several cards at once.</p>
<p>FINORA's Debt Management service builds a step-by-step repayment plan around your budget.</p>$b$)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, category = EXCLUDED.category, summary = EXCLUDED.summary,
  author = EXCLUDED.author, read_minutes = EXCLUDED.read_minutes, image_url = EXCLUDED.image_url,
  published_at = EXCLUDED.published_at, body = EXCLUDED.body;
