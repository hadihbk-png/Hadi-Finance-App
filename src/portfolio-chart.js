// Allocation chart helpers for model portfolios (donut + bars), in FINORA colours.
import { escapeHtml } from './app.js';

export const ASSET_CLASSES = [
  { key: 'equities_pct', label: 'Global Equities', color: '#1A1A1A' },
  { key: 'fixed_income_pct', label: 'Fixed Income', color: '#2D6A4F' },
  { key: 'sukuk_pct', label: 'Sukuk', color: '#8FB8A3' },
  { key: 'gold_pct', label: 'Gold', color: '#B8975A' },
  { key: 'real_estate_pct', label: 'Real Estate', color: '#D8C39B' },
  { key: 'cash_pct', label: 'Cash', color: '#A8A39A' },
];

const pct = (v) => Number(v).toFixed(Number(v) % 1 ? 1 : 0);

export function allocationSlices(portfolio) {
  return ASSET_CLASSES
    .map((a) => ({ ...a, value: Number(portfolio[a.key]) }))
    .filter((a) => a.value > 0);
}

export function allocationBars(portfolio) {
  return allocationSlices(portfolio).map((a) => `
    <div class="alloc-bar-item">
      <div class="alloc-bar-header"><span>${a.label}</span><strong>${pct(a.value)}%</strong></div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:0%;background-color:${a.color}" data-width="${a.value}%"></div>
      </div>
    </div>`).join('');
}

export function donutChart(portfolio, centerLabel = 'Equities') {
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segments = allocationSlices(portfolio).map((a) => {
    const len = (a.value / 100) * c;
    const seg = `<circle class="donut__segment" r="${r}" cx="100" cy="100" fill="none" stroke="${a.color}" stroke-width="28"
      stroke-dasharray="0 ${c}" data-dash="${len} ${c - len}" stroke-dashoffset="${-offset}">
      <title>${a.label}: ${pct(a.value)}%</title></circle>`;
    offset += len;
    return seg;
  }).join('');
  return `
    <svg class="donut" viewBox="0 0 200 200" role="img" aria-label="Allocation: ${allocationSlices(portfolio).map((a) => `${a.label} ${pct(a.value)}%`).join(', ')}">
      <g transform="rotate(-90 100 100)">
        <circle r="${r}" cx="100" cy="100" fill="none" stroke="#ECE9E2" stroke-width="28"></circle>
        ${segments}
      </g>
      <text x="100" y="98" text-anchor="middle" class="donut__center-value">${pct(portfolio.equities_pct)}%</text>
      <text x="100" y="118" text-anchor="middle" class="donut__center-label">${escapeHtml(centerLabel)}</text>
    </svg>`;
}

export function allocationLegend(portfolio) {
  return `<div class="alloc-legend">${allocationSlices(portfolio).map((a) => `
    <div class="alloc-legend__item">
      <span class="alloc-legend__name"><span class="alloc-legend__swatch" style="background:${a.color}"></span>${a.label}</span>
      <strong>${pct(a.value)}%</strong>
    </div>`).join('')}</div>`;
}

// Starts the bar and donut animations after the markup is in the page.
export function animateAllocation(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll('[data-width]').forEach((el) => { el.style.width = el.dataset.width; });
    root.querySelectorAll('[data-dash]').forEach((el) => { el.setAttribute('stroke-dasharray', el.dataset.dash); });
  }));
}
