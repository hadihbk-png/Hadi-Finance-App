// Calculators page: "Save" buttons for logged-in users (POST /api/calculations).
// The calculators themselves keep working for everyone without an account.
import { api, currentUser, toast, setBusy, loginUrl } from './app.js';

const TYPES = {
  'tab-networth': 'net-worth',
  'tab-savings': 'savings',
  'tab-compound': 'compound-growth',
  'tab-mortgage': 'mortgage',
  'tab-education': 'education',
};

const clean = (text) => String(text).replace(/\s+/g, ' ').trim().slice(0, 60);

function collectInputs(panel) {
  const inputs = {};
  panel.querySelectorAll('input, select').forEach((el) => {
    if (!el.id || el.type === 'button') return;
    const label = panel.querySelector(`label[for="${el.id}"]`);
    const key = clean(label ? label.textContent : el.id);
    if (el.tagName === 'SELECT') {
      inputs[key] = clean(el.options[el.selectedIndex]?.text || el.value);
    } else if (el.type === 'date') {
      inputs[key] = el.value || '—';
    } else {
      const n = Number(el.value);
      inputs[key] = Number.isFinite(n) ? n : clean(el.value);
    }
  });
  return inputs;
}

function collectResults(panel) {
  const result = {};
  const primary = panel.querySelector('.results-card__primary-value');
  if (primary) {
    const label = panel.querySelector('.results-card__label');
    result[clean(label ? label.textContent : 'Result')] = clean(primary.textContent);
  }
  panel.querySelectorAll('.nw-summary-item').forEach((item) => {
    result[clean(item.querySelector('.nw-summary-label').textContent)] = clean(item.querySelector('.nw-summary-val').textContent);
  });
  panel.querySelectorAll('.results-breakdown-table .table-row').forEach((row) => {
    const [k, v] = row.children;
    if (k && v) result[clean(k.textContent)] = clean(v.textContent);
  });
  const status = panel.querySelector('[id$="-res-status"]');
  if (status) result.Status = clean(status.textContent);
  return result;
}

async function init() {
  const user = await currentUser();
  document.querySelectorAll('.calc-panel').forEach((panel) => {
    const type = TYPES[panel.id];
    if (!type) return;
    const row = document.createElement('div');
    row.className = 'calc-save-row';
    row.innerHTML = user
      ? '<span class="calc-save-row__hint">Saved calculations appear on My Plan.</span><button type="button" class="btn btn--gold btn--sm">Save Calculation</button>'
      : `<span class="calc-save-row__hint"><a href="${loginUrl()}">Log in</a> or <a href="/signup.html">create an account</a> to save your calculations.</span>`;
    const anchor = panel.querySelector('.calc-disclaimer-card:last-of-type') || panel.lastElementChild;
    anchor.insertAdjacentElement('afterend', row);

    const button = row.querySelector('button');
    if (!button) return;
    button.addEventListener('click', async () => {
      setBusy(button, true);
      try {
        await api('/api/calculations', {
          method: 'POST',
          body: { calculator_type: type, inputs: collectInputs(panel), result: collectResults(panel) },
        });
        toast('Calculation saved to My Plan.', 'success');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        setBusy(button, false);
      }
    });
  });
}

init();
