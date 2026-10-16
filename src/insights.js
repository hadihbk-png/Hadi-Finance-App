// Insights page: articles and categories from /api/insights, with filter and search.
import './nav.js';
import { api, escapeHtml, formatDate, skeletonCards, emptyState } from './app.js';

const grid = document.getElementById('articles-grid');
const pillsBox = document.getElementById('topic-pills');
const search = document.getElementById('insights-search');

let articles = [];
let activeCategory = 'all';

const CLOCK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';

function card(a) {
  const href = `/article.html?slug=${encodeURIComponent(a.slug)}`;
  return `
    <article class="article-card">
      ${a.image_url ? `<a href="${href}" tabindex="-1" aria-hidden="true"><img class="article-card__image" src="${escapeHtml(a.image_url)}" alt="" loading="lazy"></a>` : ''}
      <span class="article-tag">${escapeHtml(a.category)}</span>
      <h2 class="article-title"><a href="${href}">${escapeHtml(a.title)}</a></h2>
      <p class="article-subtitle">${escapeHtml(a.author)} · ${formatDate(a.published_at)}</p>
      <p class="article-excerpt">${escapeHtml(a.summary)}</p>
      <div class="article-footer">
        <span class="article-read-time">${CLOCK} ${a.read_minutes} min read</span>
        <a href="${href}" class="btn-read-article">Read Article →</a>
      </div>
    </article>`;
}

function render() {
  const q = search.value.trim().toLowerCase();
  const visible = articles.filter((a) =>
    (activeCategory === 'all' || a.category === activeCategory) &&
    (!q || `${a.title} ${a.summary} ${a.category}`.toLowerCase().includes(q)));

  grid.innerHTML = visible.length
    ? visible.map(card).join('')
    : `<div style="grid-column:1/-1">${emptyState({
      title: 'No articles match your search',
      text: 'Try a different word or choose another topic.',
    })}</div>`;
}

function renderPills(categories) {
  pillsBox.innerHTML = ['all', ...categories].map((c) => `
    <button type="button" class="topic-pill${c === activeCategory ? ' active' : ''}" data-filter="${escapeHtml(c)}">
      ${c === 'all' ? 'All Topics' : escapeHtml(c)}
    </button>`).join('');
}

pillsBox.addEventListener('click', (e) => {
  const pill = e.target.closest('.topic-pill');
  if (!pill) return;
  activeCategory = pill.dataset.filter;
  pillsBox.querySelectorAll('.topic-pill').forEach((p) => p.classList.toggle('active', p === pill));
  render();
});

search.addEventListener('input', render);

async function load() {
  grid.innerHTML = skeletonCards(3, { lines: 3, block: true });
  try {
    const data = await api('/api/insights');
    articles = data.insights;
    renderPills(data.categories);
    if (!articles.length) {
      grid.innerHTML = `<div style="grid-column:1/-1">${emptyState({ title: 'No articles yet', text: 'New insights are on the way. Please check back soon.' })}</div>`;
      return;
    }
    render();
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1">${emptyState({ title: 'Insights are unavailable right now', text: err.message, actionLabel: 'Try Again', actionHref: '/insights.html' })}</div>`;
  } finally {
    grid.removeAttribute('aria-busy');
  }
}

load();
