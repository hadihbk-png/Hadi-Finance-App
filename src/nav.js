// FINORA - Universal Navigation Controller for all pages
import './app.js';
import './currency.js';

export function initNavigation() {
  const mb = document.getElementById('mobile-menu-btn');
  const md = document.getElementById('mobile-nav-drawer');
  const cb = document.getElementById('close-mobile-nav-btn');

  if (mb && md) {
    mb.addEventListener('click', () => {
      md.hidden = false;
      setTimeout(() => md.classList.add('open'), 10);
      document.body.style.overflow = 'hidden';
      mb.setAttribute('aria-expanded', 'true');
    });
  }

  if (cb && md) {
    cb.addEventListener('click', () => {
      md.classList.remove('open');
      document.body.style.overflow = '';
      if (mb) mb.setAttribute('aria-expanded', 'false');
      setTimeout(() => { md.hidden = true; }, 320);
    });
  }

  if (md) {
    md.addEventListener('click', (e) => {
      if (e.target === md) {
        md.classList.remove('open');
        document.body.style.overflow = '';
        if (mb) mb.setAttribute('aria-expanded', 'false');
        setTimeout(() => { md.hidden = true; }, 320);
      }
    });
  }

  // Highlight current active page link automatically
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    if (href === currentPath || (currentPath === '/' && (href === '/' || href === '/index.html' || href === '#hero'))) {
      link.classList.add('active');
    } else if (href.length > 1 && currentPath.endsWith(href)) {
      link.classList.add('active');
    }
  });
}

// Auto-run if loaded via script tag
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }
}
