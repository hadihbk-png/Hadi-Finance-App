import './nav.js';
import { formatCurrency } from './currency.js';

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================================================
  // 1. Navigation Scroll Effect & Active Section Tracker
  // ==========================================================================
  const siteHeader = document.getElementById('site-header');
  const brandLogo = document.getElementById('brand-logo');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('main section[id]');

  const handleScroll = () => {
    const scrollY = window.scrollY;

    // Header styling & Logo color switch
    if (scrollY > 50) {
      siteHeader.classList.add('scrolled');
      brandLogo.classList.remove('finora-logo--white');
      brandLogo.classList.add('finora-logo--charcoal');
    } else {
      siteHeader.classList.remove('scrolled');
      brandLogo.classList.add('finora-logo--white');
      brandLogo.classList.remove('finora-logo--charcoal');
    }

    // Active navigation link tracking
    let currentSectionId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // ==========================================================================
  // 2. Mobile Navigation Drawer
  // ==========================================================================
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const closeMobileNavBtn = document.getElementById('close-mobile-nav-btn');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  const openMobileNav = () => {
    mobileNavDrawer.hidden = false;
    setTimeout(() => mobileNavDrawer.classList.add('open'), 10);
    mobileMenuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  const closeMobileNav = () => {
    mobileNavDrawer.classList.remove('open');
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { mobileNavDrawer.hidden = true; }, 350);
  };

  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileNav);
  if (closeMobileNavBtn) closeMobileNavBtn.addEventListener('click', closeMobileNav);
  
  mobileNavDrawer.addEventListener('click', (e) => {
    if (e.target === mobileNavDrawer) closeMobileNav();
  });

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileNav();
    });
  });

  // ==========================================================================
  // 3. Interactive Financial Health Preview Simulator
  // ==========================================================================
  const inputIncome = document.getElementById('input-income');
  const inputExpense = document.getElementById('input-expense');
  const inputAssets = document.getElementById('input-assets');
  const inputDebt = document.getElementById('input-debt');

  const displayIncome = document.getElementById('display-income');
  const displayExpense = document.getElementById('display-expense');
  const displayAssets = document.getElementById('display-assets');
  const displayDebt = document.getElementById('display-debt');

  const dashHealthScore = document.getElementById('dash-health-score');
  const dashScoreBar = document.getElementById('dash-score-bar');
  const dashNetWorth = document.getElementById('dash-net-worth');
  const dashCashflow = document.getElementById('dash-cashflow');
  const dashIncomeVal = document.getElementById('dash-income-val');
  const dashExpenseVal = document.getElementById('dash-expense-val');
  const dashSavingsRate = document.getElementById('dash-savings-rate');
  const dashSavingsBar = document.getElementById('dash-savings-bar');
  const dashEmergencyVal = document.getElementById('dash-emergency-val');
  const dashAssetsVal = document.getElementById('dash-assets-val');
  const dashLiabilitiesVal = document.getElementById('dash-liabilities-val');
  const btnResetSimulator = document.getElementById('btn-reset-simulator');

  const updateHealthDashboard = () => {
    const income = parseFloat(inputIncome.value) || 0;
    const expense = parseFloat(inputExpense.value) || 0;
    const assets = parseFloat(inputAssets.value) || 0;
    const debt = parseFloat(inputDebt.value) || 0;

    // Readout displays
    displayIncome.textContent = formatCurrency(income);
    displayExpense.textContent = formatCurrency(expense);
    displayAssets.textContent = formatCurrency(assets);
    displayDebt.textContent = formatCurrency(debt);

    // Calculations
    const netWorth = assets - debt;
    const monthlyCashflow = income - expense;
    const savingsRate = income > 0 ? Math.max(0, Math.min(100, ((monthlyCashflow / income) * 100))) : 0;
    
    // Assume 30% of total assets is in liquid emergency reserves
    const estimatedLiquid = assets * 0.28;
    const emergencyMonths = expense > 0 ? (estimatedLiquid / expense).toFixed(1) : 0;

    // Algorithmic Financial Health Score (Weighted index 0 - 100)
    // 1. Savings rate (max 35 pts)
    const scoreSavings = Math.min(35, (savingsRate / 40) * 35);
    // 2. Debt-to-Asset ratio (max 25 pts)
    const debtRatio = assets > 0 ? debt / assets : 1;
    const scoreDebt = Math.max(0, 25 - (debtRatio * 35));
    // 3. Emergency cushion (max 25 pts)
    const scoreCushion = Math.min(25, (emergencyMonths / 6) * 25);
    // 4. Net worth scale (max 15 pts)
    const scoreNetWorth = Math.min(15, (Math.max(0, netWorth) / 1000000) * 15);

    const totalScore = Math.round(Math.max(10, Math.min(99, scoreSavings + scoreDebt + scoreCushion + scoreNetWorth)));

    // DOM Updates
    dashHealthScore.textContent = totalScore;
    dashScoreBar.style.width = `${totalScore}%`;

    dashNetWorth.textContent = formatCurrency(netWorth);
    dashCashflow.innerHTML = `${monthlyCashflow >= 0 ? '+' : ''}${formatCurrency(monthlyCashflow)}<span class="dash-unit">/mo</span>`;
    dashIncomeVal.textContent = formatCurrency(income);
    dashExpenseVal.textContent = formatCurrency(expense);

    dashSavingsRate.textContent = `${savingsRate.toFixed(1)}%`;
    dashSavingsBar.style.width = `${savingsRate}%`;

    dashEmergencyVal.textContent = formatCurrency(estimatedLiquid);
    dashAssetsVal.textContent = formatCurrency(assets);
    dashLiabilitiesVal.textContent = formatCurrency(debt);
  };

  [inputIncome, inputExpense, inputAssets, inputDebt].forEach(slider => {
    slider.addEventListener('input', updateHealthDashboard);
  });

  if (btnResetSimulator) {
    btnResetSimulator.addEventListener('click', () => {
      inputIncome.value = 18500;
      inputExpense.value = 9200;
      inputAssets.value = 1420000;
      inputDebt.value = 310000;
      updateHealthDashboard();
    });
  }

  // ==========================================================================
  // 4. Calculators & Scenario Engine
  // ==========================================================================
  
  // Tab Switching
  const calcTabs = document.querySelectorAll('.calc-tab');
  const calcPanels = document.querySelectorAll('.calc-panel');

  calcTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      calcTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      calcPanels.forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const targetPanelId = tab.getAttribute('aria-controls');
      const targetPanel = document.getElementById(targetPanelId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.hidden = false;
      }
    });
  });

  // Retirement Calculator Logic
  const retireCurrentAge = document.getElementById('retire-current-age');
  const retireTargetAge = document.getElementById('retire-target-age');
  const retireCurrentSavings = document.getElementById('retire-current-savings');
  const retireMonthlyContrib = document.getElementById('retire-monthly-contrib');
  const retirePortfolioModel = document.getElementById('retire-portfolio-model');

  const readoutCurrentAge = document.getElementById('readout-current-age');
  const readoutTargetAge = document.getElementById('readout-target-age');
  const readoutCurrentSavings = document.getElementById('readout-current-savings');
  const readoutMonthlyContrib = document.getElementById('readout-monthly-contrib');

  const resTargetAgeLabel = document.getElementById('res-target-age-label');
  const resYearsLabel = document.getElementById('res-years-label');
  const resProjectedCapital = document.getElementById('res-projected-capital');
  const resTotalContributions = document.getElementById('res-total-contributions');
  const resInitialCapital = document.getElementById('res-initial-capital');
  const resCompoundReturn = document.getElementById('res-compound-return');
  const resMonthlyIncome = document.getElementById('res-monthly-income');

  const calculateRetirement = () => {
    let currentAge = parseInt(retireCurrentAge.value, 10);
    let targetAge = parseInt(retireTargetAge.value, 10);

    // Keep targetAge >= currentAge + 1
    if (targetAge <= currentAge) {
      targetAge = currentAge + 1;
      retireTargetAge.value = targetAge;
    }

    const currentSavings = parseFloat(retireCurrentSavings.value) || 0;
    const monthlyContrib = parseFloat(retireMonthlyContrib.value) || 0;
    const annualRate = parseFloat(retirePortfolioModel.value) || 0.06;

    const years = targetAge - currentAge;
    const months = years * 12;
    const monthlyRate = annualRate / 12;

    // Compound Interest Formula
    // FV = P * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
    const initialFV = currentSavings * Math.pow(1 + monthlyRate, months);
    const contributionsFV = monthlyContrib * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
    const totalProjected = initialFV + contributionsFV;

    const totalContribDirect = monthlyContrib * months;
    const compoundGrowth = Math.max(0, totalProjected - currentSavings - totalContribDirect);
    const estimatedMonthlyIncome = (totalProjected * 0.04) / 12; // 4% Rule

    // Update displays
    readoutCurrentAge.textContent = `${currentAge} yrs`;
    readoutTargetAge.textContent = `${targetAge} yrs`;
    readoutCurrentSavings.textContent = formatCurrency(currentSavings);
    readoutMonthlyContrib.textContent = formatCurrency(monthlyContrib);

    resTargetAgeLabel.textContent = targetAge;
    resYearsLabel.textContent = years;
    resProjectedCapital.textContent = formatCurrency(totalProjected);
    resTotalContributions.textContent = formatCurrency(totalContribDirect);
    resInitialCapital.textContent = formatCurrency(currentSavings);
    resCompoundReturn.textContent = formatCurrency(compoundGrowth);
    resMonthlyIncome.textContent = `${formatCurrency(estimatedMonthlyIncome)} / mo`;
  };

  [retireCurrentAge, retireTargetAge, retireCurrentSavings, retireMonthlyContrib, retirePortfolioModel].forEach(elem => {
    elem.addEventListener('input', calculateRetirement);
  });

  // Goal Horizon Calculator Logic
  const goalTargetAmount = document.getElementById('goal-target-amount');
  const goalTimeframe = document.getElementById('goal-timeframe');
  const goalStartingAmount = document.getElementById('goal-starting-amount');

  const readoutGoalTarget = document.getElementById('readout-goal-target');
  const readoutGoalYears = document.getElementById('readout-goal-years');
  const readoutGoalSeed = document.getElementById('readout-goal-seed');

  const resMonthlyGoalSavings = document.getElementById('res-monthly-goal-savings');
  const resGoalYearsText = document.getElementById('res-goal-years-text');
  const resGoalTargetText = document.getElementById('res-goal-target-text');
  const resGoalContributions = document.getElementById('res-goal-contributions');
  const resGoalSeedText = document.getElementById('res-goal-seed-text');
  const resGoalCompound = document.getElementById('res-goal-compound');

  const calculateGoalHorizon = () => {
    const target = parseFloat(goalTargetAmount.value) || 0;
    const years = parseInt(goalTimeframe.value, 10) || 1;
    const seed = parseFloat(goalStartingAmount.value) || 0;
    const annualReturn = 0.05; // 5% conservative assumption
    const monthlyRate = annualReturn / 12;
    const months = years * 12;

    readoutGoalTarget.textContent = formatCurrency(target);
    readoutGoalYears.textContent = `${years} Year${years > 1 ? 's' : ''}`;
    readoutGoalSeed.textContent = formatCurrency(seed);

    // FV of seed
    const seedFV = seed * Math.pow(1 + monthlyRate, months);
    const remainingNeeded = Math.max(0, target - seedFV);

    // PMT = FV_remaining * r / ((1 + r)^n - 1)
    let requiredMonthly = 0;
    if (months > 0 && remainingNeeded > 0) {
      requiredMonthly = (remainingNeeded * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
    }

    const totalContrib = requiredMonthly * months;
    const totalGrowth = Math.max(0, target - seed - totalContrib);

    resMonthlyGoalSavings.textContent = `${formatCurrency(requiredMonthly)} / mo`;
    resGoalYearsText.textContent = years;
    resGoalTargetText.textContent = formatCurrency(target);
    resGoalContributions.textContent = formatCurrency(totalContrib);
    resGoalSeedText.textContent = formatCurrency(seed);
    resGoalCompound.textContent = formatCurrency(totalGrowth);
  };

  [goalTargetAmount, goalTimeframe, goalStartingAmount].forEach(elem => {
    if (elem) elem.addEventListener('input', calculateGoalHorizon);
  });

  // Risk profile card selection
  const riskCards = document.querySelectorAll('.risk-card');
  riskCards.forEach(card => {
    card.addEventListener('click', () => {
      riskCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // ==========================================================================
  // 5. Interactive Financial Assessment Modal Wizard
  // ==========================================================================
  const assessmentModal = document.getElementById('assessment-modal');
  const closeAssessmentModalBtn = document.getElementById('close-assessment-modal');
  const openAssessmentBtns = [
    document.getElementById('btn-open-assessment'),
    document.getElementById('hero-cta-assessment'),
    document.getElementById('btn-mobile-assessment'),
    document.getElementById('btn-trust-assessment'),
    document.getElementById('btn-take-risk-assessment')
  ];

  const wizardSteps = document.querySelectorAll('.wizard-step');
  const stepIndicators = document.querySelectorAll('.step-indicator');

  const openAssessmentModal = () => {
    assessmentModal.hidden = false;
    setTimeout(() => assessmentModal.classList.add('open'), 10);
    document.body.style.overflow = 'hidden';
  };

  const closeAssessmentModal = () => {
    assessmentModal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { assessmentModal.hidden = true; }, 300);
  };

  openAssessmentBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', openAssessmentModal);
  });

  if (closeAssessmentModalBtn) {
    closeAssessmentModalBtn.addEventListener('click', closeAssessmentModal);
  }

  assessmentModal.addEventListener('click', (e) => {
    if (e.target === assessmentModal) closeAssessmentModal();
  });

  const goToWizardStep = (stepNumber) => {
    wizardSteps.forEach(s => {
      s.classList.remove('active');
      s.hidden = true;
    });

    const targetStep = document.getElementById(`wizard-step-${stepNumber}`);
    if (targetStep) {
      targetStep.classList.add('active');
      targetStep.hidden = false;
    }

    stepIndicators.forEach(ind => {
      const num = parseInt(ind.getAttribute('data-step'), 10);
      ind.classList.remove('active', 'completed');
      if (num === stepNumber) {
        ind.classList.add('active');
      } else if (num < stepNumber) {
        ind.classList.add('completed');
      }
    });
  };

  document.querySelectorAll('.wizard-next-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStep = parseInt(btn.getAttribute('data-next'), 10);
      goToWizardStep(nextStep);
    });
  });

  document.querySelectorAll('.wizard-prev-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prevStep = parseInt(btn.getAttribute('data-prev'), 10);
      goToWizardStep(prevStep);
    });
  });

  // Calculate Wizard Score
  const btnCalculateAssessment = document.getElementById('btn-calculate-assessment');
  if (btnCalculateAssessment) {
    btnCalculateAssessment.addEventListener('click', () => {
      const inc = parseFloat(document.getElementById('wiz-income').value) || 16000;
      const exp = parseFloat(document.getElementById('wiz-expenses').value) || 8500;
      const ast = parseFloat(document.getElementById('wiz-assets').value) || 950000;
      const lia = parseFloat(document.getElementById('wiz-liabilities').value) || 280000;

      const surplus = inc - exp;
      const savingsPercent = inc > 0 ? (surplus / inc) * 100 : 0;
      const netWorth = ast - lia;

      // Score
      let score = 50;
      if (savingsPercent >= 35) score += 20;
      else if (savingsPercent >= 20) score += 12;

      if (netWorth > 1000000) score += 18;
      else if (netWorth > 500000) score += 14;
      else if (netWorth > 200000) score += 8;

      if (lia < ast * 0.3) score += 12;

      score = Math.min(96, Math.max(45, Math.round(score)));

      document.getElementById('wiz-result-score').textContent = score;
      document.getElementById('wiz-result-savings-rate').textContent = `${savingsPercent.toFixed(1)}%`;
      document.getElementById('wiz-result-networth').textContent = formatCurrency(netWorth);
      document.getElementById('wiz-result-surplus').textContent = `${surplus >= 0 ? '+' : ''}${formatCurrency(surplus)}/mo`;

      goToWizardStep(5);
    });
  }

  // Booking from Wizard
  const btnWizBookConsult = document.getElementById('btn-wiz-book-consult');
  if (btnWizBookConsult) {
    btnWizBookConsult.addEventListener('click', () => {
      closeAssessmentModal();
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const nameInput = document.getElementById('consult-name');
        if (nameInput) setTimeout(() => nameInput.focus(), 600);
      }
    });
  }

  // ==========================================================================
  // 6. Client Portal Login Modal
  // ==========================================================================
  const loginModal = document.getElementById('login-modal');
  const closeLoginModalBtn = document.getElementById('close-login-modal');
  const openLoginBtns = [
    document.getElementById('btn-open-login'),
    document.getElementById('btn-mobile-login'),
    document.getElementById('footer-client-login')
  ];
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  const loginFeedback = document.getElementById('login-feedback');

  const openLoginModal = () => {
    loginModal.hidden = false;
    setTimeout(() => loginModal.classList.add('open'), 10);
    document.body.style.overflow = 'hidden';
  };

  const closeLoginModal = () => {
    loginModal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { loginModal.hidden = true; }, 300);
  };

  openLoginBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', openLoginModal);
  });

  if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', closeLoginModal);
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) closeLoginModal();
  });

  if (btnSubmitLogin) {
    btnSubmitLogin.addEventListener('click', () => {
      loginFeedback.hidden = false;
    });
  }

  // ==========================================================================
  // 7. Service Detail Modal & Knowledge Catalog
  // ==========================================================================
  const serviceDetailModal = document.getElementById('service-detail-modal');
  const closeServiceModalBtn = document.getElementById('close-service-modal');
  const serviceModalTitle = document.getElementById('service-modal-title');
  const serviceModalLead = document.getElementById('service-modal-lead');
  const serviceModalDeliverables = document.getElementById('service-modal-deliverables');
  const serviceModalQuestions = document.getElementById('service-modal-questions');
  const btnServiceModalConsult = document.getElementById('btn-service-modal-consult');

  const servicesData = {
    health: {
      title: "Financial Health Assessment",
      category: "DIAGNOSTIC ADVISORY",
      lead: "A disciplined, comprehensive diagnostic audit of your household balance sheet, liquidity buffers, and cash flow efficiency to establish your true baseline.",
      deliverables: [
        "Consolidated balance sheet statement cataloging all personal & business holdings",
        "Debt-to-income and debt service ratio evaluation",
        "Emergency reserve stress testing across 6, 12, and 18-month scenarios",
        "Personalized Financial Health Scorecard and prioritized action list"
      ],
      questions: [
        "Do I have sufficient liquidity to withstand unexpected career or business disruptions?",
        "Are high-interest liabilities quietly dragging down my compounding rate?",
        "Is my household cash flow structured efficiently for taxes and investment?"
      ]
    },
    investment: {
      title: "Investment Planning",
      category: "PORTFOLIO ARCHITECTURE",
      lead: "Strategic, evidence-based asset allocation designed to protect capital and compound enduring wealth across full market cycles, completely free of broker incentives.",
      deliverables: [
        "Unbiased assessment of your existing holdings, expense ratios, and hidden fees",
        "Bespoke strategic asset allocation model tailored to your family's timeline",
        "Tax-location strategy (structuring taxable vs. tax-advantaged accounts)",
        "Systematic rebalancing framework and cash-drag mitigation protocol"
      ],
      questions: [
        "Is my portfolio excessively concentrated in my employer's stock or domestic assets?",
        "Am I paying excessive management or transaction fees without realizing it?",
        "How can I position my assets to protect against currency debasement and inflation?"
      ]
    },
    retirement: {
      title: "Retirement Planning",
      category: "LIFETIME INDEPENDENCE",
      lead: "Empowering you to step away from active employment on your terms with mathematical confidence, predictable cash flow, and lifelong financial sovereignty.",
      deliverables: [
        "Multi-variable retirement capital modeling (Monte Carlo probability testing)",
        "Dynamic safe withdrawal strategy coordinating pensions and personal portfolios",
        "Longevity risk shielding and late-in-life healthcare expense contingencies",
        "Annual retirement income distribution roadmap minimizing bracket creep"
      ],
      questions: [
        "At what exact age can I comfortably retire without running out of capital?",
        "What is my safe sustainable monthly income under conservative market assumptions?",
        "How do I transition from decades of saving into purposeful spending?"
      ]
    },
    savings: {
      title: "Savings & Goal Planning",
      category: "MILESTONE STRUCTURING",
      lead: "Turn broad personal ambitions into mathematically calibrated saving milestones, ensuring major life purchases do not derail your core retirement trajectory.",
      deliverables: [
        "Targeted capital accumulation schedules for primary residences, land, or ventures",
        "High-yield cash management and short-term capital preservation architecture",
        "Automated savings frameworks aligned with variable compensation or bonuses",
        "Opportunity cost analysis comparing debt payoff vs. capital deployment"
      ],
      questions: [
        "How much liquid capital should I reserve before making a major property acquisition?",
        "How can I automate savings without feeling constrained in my daily lifestyle?",
        "Where should I park funds needed within the next 2 to 4 years?"
      ]
    },
    risk: {
      title: "Risk Profile Assessment",
      category: "BEHAVIORAL & QUANTITATIVE",
      lead: "A deep two-tier evaluation separating your subjective emotional loss aversion from your objective financial risk capacity and capital recovery duration.",
      deliverables: [
        "Psychometric evaluation of risk tolerance and past behavioral responses",
        "Quantitative risk capacity audit based on human capital and liabilities",
        "Tail-risk stress test simulating severe global market drawdowns (-20% to -45%)",
        "Personalized Investment Policy Statement (IPS) codifying your risk boundaries"
      ],
      questions: [
        "Will I be tempted to panic-sell during a severe market pullback?",
        "Is my current portfolio taking on more volatility than is necessary to meet my goals?",
        "How do my investment horizon and cash needs change my capacity for risk?"
      ]
    },
    education: {
      title: "Education Planning",
      category: "GENERATIONAL EMPOWERMENT",
      lead: "Ensuring the next generation enjoys world-class educational opportunities through tax-advantaged accounts, trusts, and disciplined tuition funding plans.",
      deliverables: [
        "Projected future tuition and living cost inflation projections for target universities",
        "Optimization of 529 plans, educational trusts, and tax-deferred savings vehicles",
        "Grandparent and extended family gifting coordination strategies",
        "Contingency life and disability funding safeguards"
      ],
      questions: [
        "How much should I contribute monthly today to fully fund an Ivy League or international education?",
        "What happens to the savings if my child receives scholarships or attends university abroad?",
        "How do I involve grandparents without triggering adverse gift tax consequences?"
      ]
    },
    wealth: {
      title: "Wealth Planning",
      category: "FAMILY OFFICE & LEGACY",
      lead: "Holistic multi-generational wealth preservation designed to safeguard family harmony, mitigate estate taxation, and ensure enduring legacy transfer.",
      deliverables: [
        "Coordination with your estate planning attorneys and tax counsel",
        "Revocable and irrevocable trust structuring review",
        "Multi-generational family wealth charter and governance philosophy",
        "Philanthropic giving foundations and donor-advised fund (DAF) architecture"
      ],
      questions: [
        "Will our wealth unite or divide our children after we are gone?",
        "How can we minimize estate taxes and probate friction for our heirs?",
        "How do we prepare our heirs to become responsible stewards of substantial capital?"
      ]
    },
    calculators: {
      title: "Financial Calculators & Scenario Tools",
      category: "PLANNING INSTRUMENTS",
      lead: "Sophisticated educational simulators enabling individuals and families to visualize long-term financial outcomes with clarity and precision.",
      deliverables: [
        "Compound growth and inflation-adjusted purchasing power models",
        "Interactive retirement readiness and income gap simulators",
        "Asset allocation risk-return matrix visualizer",
        "Custom scenario export dossier ready for advisor consultation"
      ],
      questions: [
        "How does a 1% difference in annualized net return affect my 25-year nest egg?",
        "What impact does an early retirement by 3 years have on my lifetime required capital?",
        "How do varying inflation assumptions alter my required living budget?"
      ]
    }
  };

  const openServiceModal = (serviceKey) => {
    const data = servicesData[serviceKey] || servicesData.health;
    serviceModalTitle.textContent = data.title;
    document.getElementById('service-modal-category').textContent = data.category;
    serviceModalLead.textContent = data.lead;

    serviceModalDeliverables.innerHTML = '';
    data.deliverables.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      serviceModalDeliverables.appendChild(li);
    });

    serviceModalQuestions.innerHTML = '';
    data.questions.forEach(q => {
      const li = document.createElement('li');
      li.textContent = q;
      serviceModalQuestions.appendChild(li);
    });

    serviceDetailModal.hidden = false;
    setTimeout(() => serviceDetailModal.classList.add('open'), 10);
    document.body.style.overflow = 'hidden';
  };

  const closeServiceModal = () => {
    serviceDetailModal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { serviceDetailModal.hidden = true; }, 300);
  };

  document.querySelectorAll('[data-open-service]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const serviceKey = btn.getAttribute('data-open-service');
      openServiceModal(serviceKey);
    });
  });

  if (closeServiceModalBtn) closeServiceModalBtn.addEventListener('click', closeServiceModal);
  serviceDetailModal.addEventListener('click', (e) => {
    if (e.target === serviceDetailModal) closeServiceModal();
  });

  if (btnServiceModalConsult) {
    btnServiceModalConsult.addEventListener('click', () => {
      closeServiceModal();
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const notes = document.getElementById('consult-notes');
        if (notes) {
          notes.value = `Inquiry regarding: ${serviceModalTitle.textContent}. I would like to explore this service in an introductory consultation.`;
        }
      }
    });
  }

  // ==========================================================================
  // 8. Consultation Request Form Submission
  // ==========================================================================
  const consultForm = document.getElementById('consultation-form');
  const consultSuccessMsg = document.getElementById('consultation-success');
  const btnSubmitConsult = document.getElementById('btn-submit-consultation');

  if (consultForm) {
    consultForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('consult-name').value.trim();
      const email = document.getElementById('consult-email').value.trim();

      if (!name || !email) {
        alert('Please provide your name and email address for your consultation request.');
        return;
      }

      btnSubmitConsult.disabled = true;
      btnSubmitConsult.textContent = 'Transmitting Confidential Inquiry...';

      setTimeout(() => {
        btnSubmitConsult.style.display = 'none';
        consultSuccessMsg.hidden = false;
        consultForm.reset();
      }, 700);
    });
  }

  // Quick Scenario Consultation Button
  const btnSaveScenario = document.getElementById('btn-save-scenario');
  if (btnSaveScenario) {
    btnSaveScenario.addEventListener('click', () => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const notes = document.getElementById('consult-notes');
        if (notes) {
          notes.value = `Discussing Retirement Scenario: Current Age ${retireCurrentAge.value}, Target Retirement Age ${retireTargetAge.value}, Monthly Contribution $${retireMonthlyContrib.value}. Projected Nest Egg: ${resProjectedCapital.textContent}.`;
        }
      }
    });
  }

  const btnGoalConsult = document.getElementById('btn-goal-consult');
  if (btnGoalConsult) {
    btnGoalConsult.addEventListener('click', () => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const notes = document.getElementById('consult-notes');
        if (notes) {
          notes.value = `Discussing Financial Goal: Target $${goalTargetAmount.value} over ${goalTimeframe.value} years with initial seed of $${goalStartingAmount.value}.`;
        }
      }
    });
  }

  const btnRequestReview = document.getElementById('btn-request-review');
  if (btnRequestReview) {
    btnRequestReview.addEventListener('click', () => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        const notes = document.getElementById('consult-notes');
        if (notes) {
          notes.value = `Requesting comprehensive balance sheet review based on sample financial health score model.`;
        }
      }
    });
  }

  // Initialize all calculations
  updateHealthDashboard();
  calculateRetirement();
  calculateGoalHorizon();

  window.addEventListener('finora:currency-change', () => {
    updateHealthDashboard();
    calculateRetirement();
    calculateGoalHorizon();
  });

});
