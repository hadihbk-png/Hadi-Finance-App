// FINORA Financial Advisory - Currency formatting
// All amounts on FINORA are stored and shown in UAE Dirhams (AED).

export const CURRENCY = { code: 'AED', symbol: 'AED', name: 'UAE Dirham' };

export function getCurrencySymbol() {
  return CURRENCY.symbol;
}

// "AED 1,420,000". Pass { decimals: 2 } to show fils.
export function formatCurrency(amount, { decimals = 0 } = {}) {
  const num = typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
  const sign = num < 0 ? '-' : '';
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}AED ${formatted}`;
}

export const formatAED = formatCurrency;

// Fill any "currency symbol" placeholders left in the page markup.
function initCurrencyUI() {
  document.querySelectorAll('.currency-sym, [data-currency-sym]').forEach((el) => {
    el.textContent = CURRENCY.symbol;
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCurrencyUI);
  } else {
    initCurrencyUI();
  }
}
