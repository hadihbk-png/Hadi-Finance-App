// Services page: advisory services loaded from /api/services.
import './nav.js';
import { api, formatAED, escapeHtml, skeletonCards, emptyState } from './app.js';

const list = document.getElementById('services-list');

function serviceCard(s, i) {
  const hours = s.duration_minutes >= 60
    ? `${s.duration_minutes / 60} hour${s.duration_minutes === 60 ? '' : 's'}`
    : `${s.duration_minutes} minutes`;
  return `
    <article class="practice-card" id="service-${s.id}">
      <div class="practice-card__content">
        <span class="section-label">SERVICE ${String(i + 1).padStart(2, '0')}</span>
        <h2 class="practice-title">${escapeHtml(s.name)}</h2>
        <p class="practice-lead">${escapeHtml(s.short_description)}</p>
        <div class="practice-deliverables-box">
          <h4 class="deliverables-heading">What's included:</h4>
          <ul class="deliverables-list">${s.deliverables.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
        </div>
        <div class="mt-3">
          <a href="/contact.html?service=${s.id}" class="btn btn--secondary">Book ${escapeHtml(s.name)} →</a>
        </div>
      </div>
      <div class="practice-card__meta-panel">
        <div class="meta-tag-label">Starting From</div>
        <p class="meta-price">${formatAED(s.starting_price)}</p>
        <div class="meta-tag-label mt-3">Session Length</div>
        <p class="meta-text">${hours}</p>
        <div class="meta-tag-label mt-3">Format</div>
        <p class="meta-text">In person in Dubai or by video call</p>
      </div>
    </article>`;
}

async function load() {
  list.innerHTML = skeletonCards(3, { lines: 4 });
  try {
    const { services } = await api('/api/services');
    list.innerHTML = services.length
      ? services.map(serviceCard).join('')
      : emptyState({ title: 'Services coming soon', text: 'Our advisory services will be listed here shortly.', actionLabel: 'Contact Us', actionHref: '/contact.html' });
  } catch (err) {
    list.innerHTML = emptyState({ title: 'Services are unavailable right now', text: err.message, actionLabel: 'Try Again', actionHref: '/services.html' });
  } finally {
    list.removeAttribute('aria-busy');
  }
}

load();
