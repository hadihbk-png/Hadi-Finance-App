import './nav.js';
import './investment-portfolio.js';
import { formatCurrency } from './currency.js';

document.addEventListener('DOMContentLoaded', () => {

  const inputStart = document.getElementById('inv-starting');
  const inputMonthly = document.getElementById('inv-monthly');
  const inputPeriod = document.getElementById('inv-period');
  const inputReturn = document.getElementById('inv-return');
  const inputInflation = document.getElementById('inv-inflation');

  const readoutStart = document.getElementById('readout-inv-starting');
  const readoutMonthly = document.getElementById('readout-inv-monthly');
  const readoutPeriod = document.getElementById('readout-inv-period');
  const readoutReturn = document.getElementById('readout-inv-return');
  const readoutInflation = document.getElementById('readout-inv-inflation');

  const resFutureVal = document.getElementById('res-inv-future-val');
  const resRealVal = document.getElementById('res-inv-real-val');
  const resStartVal = document.getElementById('res-inv-start-val');
  const resContribVal = document.getElementById('res-inv-contrib-val');
  const resGrowthVal = document.getElementById('res-inv-growth-val');

  const canvas = document.getElementById('investmentChart');
  const ctx = canvas ? canvas.getContext('2d') : null;

  const updateCalculations = () => {
    const P = parseFloat(inputStart.value) || 0;
    const PMT = parseFloat(inputMonthly.value) || 0;
    const years = parseInt(inputPeriod.value, 10) || 1;
    const r = (parseFloat(inputReturn.value) || 6.5) / 100;
    const infl = (parseFloat(inputInflation.value) || 2.5) / 100;

    readoutStart.textContent = formatCurrency(P);
    readoutMonthly.textContent = formatCurrency(PMT);
    readoutPeriod.textContent = `${years} Year${years > 1 ? 's' : ''}`;
    readoutReturn.textContent = `${(r * 100).toFixed(1)}%`;
    readoutInflation.textContent = `${(infl * 100).toFixed(1)}%`;

    const monthlyRate = r / 12;
    const totalMonths = years * 12;

    // Compounded Future Value
    const startFV = P * Math.pow(1 + monthlyRate, totalMonths);
    const contribsFV = monthlyRate > 0 
      ? PMT * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate)
      : PMT * totalMonths;

    const futureValue = startFV + contribsFV;
    const totalAdded = PMT * totalMonths;
    const growth = Math.max(0, futureValue - P - totalAdded);

    // Real Value adjusted for inflation
    const realValue = futureValue / Math.pow(1 + infl, years);

    resFutureVal.textContent = formatCurrency(futureValue);
    resRealVal.textContent = formatCurrency(realValue);
    resStartVal.textContent = formatCurrency(P);
    resContribVal.textContent = formatCurrency(totalAdded);
    resGrowthVal.textContent = formatCurrency(growth);

    drawChart(P, PMT, years, r);
  };

  const drawChart = (P, PMT, years, annualRate) => {
    if (!ctx || !canvas) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const points = [];
    const monthlyRate = annualRate / 12;

    for (let y = 0; y <= years; y++) {
      const m = y * 12;
      const fvStart = P * Math.pow(1 + monthlyRate, m);
      const fvContribs = monthlyRate > 0 ? PMT * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) : PMT * m;
      const totalFV = fvStart + fvContribs;
      const totalContrib = P + (PMT * m);
      points.push({ year: y, total: totalFV, contrib: totalContrib });
    }

    const maxVal = Math.max(...points.map(p => p.total)) * 1.1 || 1;

    // Draw grid lines
    ctx.strokeStyle = '#E8E4DC';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yPos = height - 25 - (i * ((height - 40) / 4));
      ctx.beginPath();
      ctx.moveTo(40, yPos);
      ctx.lineTo(width - 15, yPos);
      ctx.stroke();
    }

    // Coordinates mapper
    const getX = (index) => 40 + (index / years) * (width - 55);
    const getY = (val) => (height - 25) - (val / maxVal) * (height - 40);

    // 1. Draw Total Value Area (Gold fill)
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].total));
    points.forEach((p, idx) => {
      ctx.lineTo(getX(idx), getY(p.total));
    });
    ctx.lineTo(getX(points.length - 1), height - 25);
    ctx.lineTo(getX(0), height - 25);
    ctx.closePath();
    ctx.fillStyle = 'rgba(184, 151, 90, 0.18)';
    ctx.fill();

    // Line for Total Value
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].total));
    points.forEach((p, idx) => {
      ctx.lineTo(getX(idx), getY(p.total));
    });
    ctx.strokeStyle = '#B8975A';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2. Draw Cumulative Contributions Line (Charcoal)
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].contrib));
    points.forEach((p, idx) => {
      ctx.lineTo(getX(idx), getY(p.contrib));
    });
    ctx.lineTo(getX(points.length - 1), height - 25);
    ctx.lineTo(getX(0), height - 25);
    ctx.closePath();
    ctx.fillStyle = 'rgba(26, 26, 26, 0.08)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].contrib));
    points.forEach((p, idx) => {
      ctx.lineTo(getX(idx), getY(p.contrib));
    });
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // X-Axis Labels
    ctx.fillStyle = '#6B6B6B';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Yr 0', getX(0), height - 8);
    ctx.fillText(`Yr ${Math.round(years / 2)}`, getX(Math.round(years / 2)), height - 8);
    ctx.fillText(`Yr ${years}`, getX(years), height - 8);
  };

  // Scenario Buttons
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const scenario = btn.getAttribute('data-scenario');
      if (scenario === 'conservative') {
        inputReturn.value = 4.5;
        inputInflation.value = 2.5;
      } else if (scenario === 'base') {
        inputReturn.value = 6.5;
        inputInflation.value = 2.5;
      } else if (scenario === 'growth') {
        inputReturn.value = 8.5;
        inputInflation.value = 2.5;
      }
      updateCalculations();
    });
  });

  [inputStart, inputMonthly, inputPeriod, inputReturn, inputInflation].forEach(el => {
    if (el) el.addEventListener('input', updateCalculations);
  });

  // Mobile menu
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

  updateCalculations();

  window.addEventListener('finora:currency-change', () => {
    updateCalculations();
  });
});
