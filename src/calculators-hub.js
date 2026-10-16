import './nav.js';
import './calculators-save.js';
import { formatCurrency, getCurrencySymbol } from './currency.js';

document.addEventListener('DOMContentLoaded', () => {

  // 1. Tab Switching
  const tabs = document.querySelectorAll('.calc-tab');
  const panels = document.querySelectorAll('.calc-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
      });

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.hidden = false;
      }

      // If switched to compound growth, trigger canvas redraw
      if (targetId === 'tab-compound') {
        setTimeout(updateCompoundCalculator, 50);
      }
    });
  });

  // Mobile Menu
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-nav-drawer');
  const closeMobileBtn = document.getElementById('close-mobile-nav-btn');

  if (mobileBtn && mobileDrawer) {
    mobileBtn.addEventListener('click', () => {
      mobileDrawer.hidden = false;
      setTimeout(() => mobileDrawer.classList.add('open'), 10);
    });
  }
  if (closeMobileBtn && mobileDrawer) {
    closeMobileBtn.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
      setTimeout(() => mobileDrawer.hidden = true, 300);
    });
  }

  // ==========================================================================
  // 2. NET WORTH CALCULATOR
  // ==========================================================================
  const assetInputs = document.querySelectorAll('.nw-asset-input');
  const liabInputs = document.querySelectorAll('.nw-liab-input');
  const totalAssetsDisp = document.getElementById('nw-total-assets');
  const totalLiabDisp = document.getElementById('nw-total-liab');
  const netWorthDisp = document.getElementById('nw-net-worth');
  const barEquity = document.getElementById('nw-bar-equity');
  const barDebt = document.getElementById('nw-bar-debt');

  const updateNetWorth = () => {
    let assets = 0;
    let liabilities = 0;

    assetInputs.forEach(i => {
      assets += parseFloat(i.value) || 0;
    });

    liabInputs.forEach(i => {
      liabilities += parseFloat(i.value) || 0;
    });

    const netWorth = assets - liabilities;
    const debtRatio = assets > 0 ? Math.min(100, (liabilities / assets) * 100) : 0;
    const equityRatio = Math.max(0, 100 - debtRatio);

    if (totalAssetsDisp) totalAssetsDisp.textContent = formatCurrency(assets);
    if (totalLiabDisp) totalLiabDisp.textContent = formatCurrency(liabilities);
    if (netWorthDisp) netWorthDisp.textContent = formatCurrency(netWorth);

    if (barEquity) barEquity.style.width = `${equityRatio}%`;
    if (barDebt) barDebt.style.width = `${debtRatio}%`;
  };

  [...assetInputs, ...liabInputs].forEach(input => {
    input.addEventListener('input', updateNetWorth);
  });
  updateNetWorth();

  // ==========================================================================
  // 3. SAVINGS CALCULATOR
  // ==========================================================================
  const savTarget = document.getElementById('sav-target');
  const savCurrent = document.getElementById('sav-current');
  const savMonthly = document.getElementById('sav-monthly');
  const savRate = document.getElementById('sav-rate');
  const savDate = document.getElementById('sav-date');

  const savResProjected = document.getElementById('sav-res-projected');
  const savResStatus = document.getElementById('sav-res-status');
  const savResContrib = document.getElementById('sav-res-contributions');
  const savResInterest = document.getElementById('sav-res-interest');
  const savResTargetDisp = document.getElementById('sav-res-target-disp');

  // Default savings date 4 years from today
  const defaultSavDate = new Date();
  defaultSavDate.setFullYear(defaultSavDate.getFullYear() + 4);
  if (savDate) savDate.value = defaultSavDate.toISOString().split('T')[0];

  const updateSavingsCalculator = () => {
    const target = parseFloat(savTarget.value) || 0;
    const current = parseFloat(savCurrent.value) || 0;
    const monthly = parseFloat(savMonthly.value) || 0;
    const annualRate = (parseFloat(savRate.value) || 4.5) / 100;
    const dateVal = savDate.value;

    let months = 48;
    if (dateVal) {
      const td = new Date(dateVal);
      const now = new Date();
      months = Math.max(1, Math.round((td.getFullYear() - now.getFullYear()) * 12 + (td.getMonth() - now.getMonth())));
    }

    const monthlyRate = annualRate / 12;
    const fvCurrent = current * Math.pow(1 + monthlyRate, months);
    const fvContrib = monthlyRate > 0 
      ? monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      : monthly * months;

    const totalProjected = fvCurrent + fvContrib;
    const totalAdded = current + (monthly * months);
    const totalInterest = Math.max(0, totalProjected - totalAdded);

    savResProjected.textContent = formatCurrency(totalProjected);
    savResContrib.textContent = formatCurrency(totalAdded);
    savResInterest.textContent = formatCurrency(totalInterest);
    savResTargetDisp.textContent = formatCurrency(target);

    if (totalProjected >= target) {
      savResStatus.textContent = 'On Track & Well Funded';
      savResStatus.className = 'status-pill status-pill--positive mt-1';
    } else {
      const gap = target - totalProjected;
      savResStatus.textContent = `Shortfall of ${formatCurrency(gap)}`;
      savResStatus.className = 'status-pill status-pill--warning mt-1';
    }
  };

  [savTarget, savCurrent, savMonthly, savRate, savDate].forEach(el => {
    if (el) el.addEventListener('input', updateSavingsCalculator);
  });
  updateSavingsCalculator();

  // ==========================================================================
  // 4. COMPOUND GROWTH CALCULATOR
  // ==========================================================================
  const cgInitial = document.getElementById('cg-initial');
  const cgMonthly = document.getElementById('cg-monthly');
  const cgYears = document.getElementById('cg-years');
  const cgRate = document.getElementById('cg-rate');
  const readoutCgYears = document.getElementById('readout-cg-years');
  const readoutCgRate = document.getElementById('readout-cg-rate');

  const cgResTotal = document.getElementById('cg-res-total');
  const cgResContrib = document.getElementById('cg-res-contrib');
  const cgResGrowth = document.getElementById('cg-res-growth');

  const compoundCanvas = document.getElementById('compoundChart');
  const cCtx = compoundCanvas ? compoundCanvas.getContext('2d') : null;

  const updateCompoundCalculator = () => {
    const P = parseFloat(cgInitial.value) || 0;
    const PMT = parseFloat(cgMonthly.value) || 0;
    const years = parseInt(cgYears.value, 10) || 1;
    const annualRate = (parseFloat(cgRate.value) || 7.0) / 100;

    readoutCgYears.textContent = `${years} Year${years > 1 ? 's' : ''}`;
    readoutCgRate.textContent = `${(annualRate * 100).toFixed(1)}%`;

    const monthlyRate = annualRate / 12;
    const months = years * 12;

    const fvStart = P * Math.pow(1 + monthlyRate, months);
    const fvContrib = monthlyRate > 0 
      ? PMT * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) 
      : PMT * months;

    const totalFV = fvStart + fvContrib;
    const directContrib = P + (PMT * months);
    const compoundGrowth = Math.max(0, totalFV - directContrib);

    cgResTotal.textContent = formatCurrency(totalFV);
    cgResContrib.textContent = formatCurrency(directContrib);
    cgResGrowth.textContent = formatCurrency(compoundGrowth);

    // Draw graph
    if (cCtx && compoundCanvas) {
      const w = compoundCanvas.width;
      const h = compoundCanvas.height;
      cCtx.clearRect(0, 0, w, h);

      const dataPoints = [];
      for (let y = 0; y <= years; y++) {
        const m = y * 12;
        const curStart = P * Math.pow(1 + monthlyRate, m);
        const curContrib = monthlyRate > 0 ? PMT * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) : PMT * m;
        dataPoints.push({ year: y, total: curStart + curContrib, direct: P + (PMT * m) });
      }

      const maxVal = Math.max(...dataPoints.map(d => d.total)) * 1.1 || 1;
      const getX = (idx) => 35 + (idx / years) * (w - 50);
      const getY = (val) => (h - 25) - (val / maxVal) * (h - 40);

      // Area fill
      cCtx.beginPath();
      cCtx.moveTo(getX(0), getY(dataPoints[0].total));
      dataPoints.forEach((d, i) => cCtx.lineTo(getX(i), getY(d.total)));
      cCtx.lineTo(getX(dataPoints.length - 1), h - 25);
      cCtx.lineTo(getX(0), h - 25);
      cCtx.closePath();
      cCtx.fillStyle = 'rgba(184, 151, 90, 0.2)';
      cCtx.fill();

      // Line
      cCtx.beginPath();
      cCtx.moveTo(getX(0), getY(dataPoints[0].total));
      dataPoints.forEach((d, i) => cCtx.lineTo(getX(i), getY(d.total)));
      cCtx.strokeStyle = '#B8975A';
      cCtx.lineWidth = 2.5;
      cCtx.stroke();

      // Axis
      cCtx.fillStyle = '#6B6B6B';
      cCtx.font = '10px Inter, sans-serif';
      cCtx.textAlign = 'center';
      cCtx.fillText('Yr 0', getX(0), h - 8);
      cCtx.fillText(`Yr ${Math.round(years / 2)}`, getX(Math.round(years / 2)), h - 8);
      cCtx.fillText(`Yr ${years}`, getX(years), h - 8);
    }
  };

  [cgInitial, cgMonthly, cgYears, cgRate].forEach(el => {
    if (el) el.addEventListener('input', updateCompoundCalculator);
  });
  updateCompoundCalculator();

  // ==========================================================================
  // 5. MORTGAGE CALCULATOR
  // ==========================================================================
  const mgPrice = document.getElementById('mg-price');
  const mgDown = document.getElementById('mg-down');
  const mgDownPct = document.getElementById('mg-down-pct');
  const mgInterest = document.getElementById('mg-interest');
  const mgTerm = document.getElementById('mg-term');

  const mgResMonthly = document.getElementById('mg-res-monthly');
  const mgResPrincipal = document.getElementById('mg-res-principal');
  const mgResInterest = document.getElementById('mg-res-interest');
  const mgResTotal = document.getElementById('mg-res-total');

  const updateMortgageCalculator = () => {
    const price = parseFloat(mgPrice.value) || 0;
    let down = parseFloat(mgDown.value) || 0;
    if (down > price) {
      down = price * 0.2;
      mgDown.value = down;
    }

    const pct = price > 0 ? ((down / price) * 100).toFixed(1) : 0;
    mgDownPct.textContent = `Down payment: ${pct}% ($${Math.round(down).toLocaleString()})`;

    const principal = Math.max(0, price - down);
    const annualRate = (parseFloat(mgInterest.value) || 5.85) / 100;
    const years = parseInt(mgTerm.value, 10) || 30;

    const monthlyRate = annualRate / 12;
    const totalPayments = years * 12;

    // Monthly payment formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    let monthlyPayment = 0;
    if (monthlyRate > 0 && totalPayments > 0 && principal > 0) {
      monthlyPayment = (principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
                       (Math.pow(1 + monthlyRate, totalPayments) - 1);
    }

    const totalRepaid = monthlyPayment * totalPayments;
    const totalInterest = Math.max(0, totalRepaid - principal);

    mgResMonthly.innerHTML = `${formatCurrency(monthlyPayment)}<span class="dash-unit">/mo</span>`;
    mgResPrincipal.textContent = formatCurrency(principal);
    mgResInterest.textContent = formatCurrency(totalInterest);
    mgResTotal.textContent = formatCurrency(totalRepaid);
  };

  [mgPrice, mgDown, mgInterest, mgTerm].forEach(el => {
    if (el) el.addEventListener('input', updateMortgageCalculator);
  });
  updateMortgageCalculator();

  // ==========================================================================
  // 6. EDUCATION PLANNER
  // ==========================================================================
  const edChildAge = document.getElementById('ed-child-age');
  const edStartAge = document.getElementById('ed-start-age');
  const edCurrentSavings = document.getElementById('ed-current-savings');
  const edCurrentCost = document.getElementById('ed-current-cost');
  const edDuration = document.getElementById('ed-duration');
  const edInflation = document.getElementById('ed-inflation');
  const edReturn = document.getElementById('ed-return');
  const edMonthlyContrib = document.getElementById('ed-monthly-contrib');

  const edResFutureCost = document.getElementById('ed-res-future-cost');
  const edResYears = document.getElementById('ed-res-years');
  const edResAccumulated = document.getElementById('ed-res-accumulated');
  const edResGap = document.getElementById('ed-res-gap');
  const edResSuggested = document.getElementById('ed-res-suggested');

  const updateEducationPlanner = () => {
    let cAge = parseInt(edChildAge.value, 10) || 0;
    let sAge = parseInt(edStartAge.value, 10) || 18;
    if (sAge <= cAge) {
      sAge = cAge + 1;
      edStartAge.value = sAge;
    }

    const currentSav = parseFloat(edCurrentSavings.value) || 0;
    const annualCostNow = parseFloat(edCurrentCost.value) || 0;
    const duration = parseInt(edDuration.value, 10) || 4;
    const inflation = (parseFloat(edInflation.value) || 4.0) / 100;
    const expectedReturn = (parseFloat(edReturn.value) || 6.0) / 100;
    const monthlyContrib = parseFloat(edMonthlyContrib.value) || 0;

    const yearsToCollege = sAge - cAge;
    const monthsToCollege = yearsToCollege * 12;
    const monthlyRate = expectedReturn / 12;

    // Projected future education cost across study duration
    let totalFutureTuition = 0;
    for (let yr = 0; yr < duration; yr++) {
      totalFutureTuition += annualCostNow * Math.pow(1 + inflation, yearsToCollege + yr);
    }

    // Accumulated savings at matriculation
    const fvCurrent = currentSav * Math.pow(1 + monthlyRate, monthsToCollege);
    const fvContribs = monthlyRate > 0 
      ? monthlyContrib * ((Math.pow(1 + monthlyRate, monthsToCollege) - 1) / monthlyRate) 
      : monthlyContrib * monthsToCollege;
    const totalAccumulated = fvCurrent + fvContribs;

    const gap = totalFutureTuition - totalAccumulated;

    edResFutureCost.textContent = formatCurrency(totalFutureTuition);
    edResYears.textContent = `${yearsToCollege} Years`;
    edResAccumulated.textContent = formatCurrency(totalAccumulated);

    if (gap > 0) {
      edResGap.textContent = `-${formatCurrency(gap)} Shortfall`;
      edResGap.className = 'text-critical';
      const extraNeededMonthly = monthlyRate > 0 
        ? (gap * monthlyRate) / (Math.pow(1 + monthlyRate, monthsToCollege) - 1)
        : gap / monthsToCollege;
      edResSuggested.textContent = `${formatCurrency(monthlyContrib + extraNeededMonthly)} / mo`;
    } else {
      edResGap.textContent = `+${formatCurrency(Math.abs(gap))} Surplus`;
      edResGap.className = 'text-positive';
      edResSuggested.textContent = `${formatCurrency(monthlyContrib)} / mo (Funded)`;
    }
  };

  [edChildAge, edStartAge, edCurrentSavings, edCurrentCost, edDuration, edInflation, edReturn, edMonthlyContrib].forEach(el => {
    if (el) el.addEventListener('input', updateEducationPlanner);
  });
  updateEducationPlanner();

  // Re-calculate all calculators on currency change
  window.addEventListener('finora:currency-change', () => {
    updateNetWorthCalculator();
    updateSavingsCalculator();
    updateCompoundCalculator();
    updateMortgageCalculator();
    updateEducationPlanner();
  });

});
