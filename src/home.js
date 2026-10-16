// Home page: live platform counters from /api/stats
import { api, animateCount } from './app.js';

async function loadStats() {
  const counters = document.querySelectorAll('[data-stat]');
  if (!counters.length) return;
  try {
    const stats = await api('/api/stats', { quiet: true });
    const run = () => counters.forEach((el) => animateCount(el, stats[el.dataset.stat]));
    // Start counting when the strip scrolls into view.
    const strip = document.querySelector('.stats-strip');
    if ('IntersectionObserver' in window && strip) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); }
      }, { threshold: 0.3 });
      io.observe(strip);
    } else {
      run();
    }
  } catch {
    counters.forEach((el) => { el.textContent = '—'; });
    const note = document.getElementById('stats-note');
    if (note) note.textContent = 'Live figures are unavailable right now.';
  }
}

loadStats();

// Swap the white logo for the charcoal one once the header turns solid on scroll
// (style.css hides .finora-logo--white inside a scrolled header).
const logo = document.getElementById('brand-logo');
const syncLogo = () => {
  const scrolled = window.scrollY > 50;
  logo?.classList.toggle('finora-logo--white', !scrolled);
  logo?.classList.toggle('finora-logo--charcoal', scrolled);
};
window.addEventListener('scroll', syncLogo, { passive: true });
syncLogo();
