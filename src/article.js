// Article page: one insight from /api/insights/:slug
import './nav.js';
import { api, escapeHtml, formatDate, emptyState } from './app.js';

const root = document.getElementById('article-root');
const relatedRoot = document.getElementById('related-root');
const slug = new URLSearchParams(window.location.search).get('slug');

function skeleton() {
  root.innerHTML = `
    <span class="skeleton skeleton--label" style="width:120px"></span>
    <span class="skeleton skeleton--title" style="height:2.6rem;width:85%"></span>
    <span class="skeleton skeleton--line"></span><span class="skeleton skeleton--line" style="width:60%"></span>
    <span class="skeleton skeleton--block" style="height:320px;margin:1.75rem 0 2rem"></span>
    <div class="article-body">${'<span class="skeleton skeleton--line"></span>'.repeat(8)}</div>`;
}

function render(article, related) {
  document.title = `${article.title} | FINORA Insights`;
  // Article bodies are written by FINORA in db/seed.sql (trusted HTML: paragraphs, headings, lists).
  root.innerHTML = `
    <a href="/insights.html" class="article-back">← All Insights</a>
    <span class="section-label">${escapeHtml(article.category)}</span>
    <h1 class="article-headline">${escapeHtml(article.title)}</h1>
    <p class="article-standfirst">${escapeHtml(article.summary)}</p>
    <div class="article-byline">
      <span>By ${escapeHtml(article.author)}</span>
      <span>${formatDate(article.published_at, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      <span>${article.read_minutes} min read</span>
    </div>
    ${article.image_url ? `<img class="article-hero-img" src="${escapeHtml(article.image_url)}" alt="">` : ''}
    <div class="article-body">
      ${article.body}
      <div class="calc-disclaimer-card mt-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8975A" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>This article is for educational purposes only and is not regulated financial advice. Rules and figures can change; check the latest details before acting.</span>
      </div>
    </div>`;

  relatedRoot.innerHTML = related.length ? `
    <div class="mt-5">
      <span class="section-label">KEEP READING</span>
      <div class="related-grid">${related.map((r) => `
        <a class="related-card" href="/article.html?slug=${encodeURIComponent(r.slug)}">
          <span class="related-card__tag">${escapeHtml(r.category)}</span>
          <h3 class="related-card__title">${escapeHtml(r.title)}</h3>
          <p class="field-hint">${r.read_minutes} min read</p>
        </a>`).join('')}
      </div>
    </div>` : '';
}

async function load() {
  if (!slug) {
    window.location.replace('/insights.html');
    return;
  }
  skeleton();
  try {
    const { article, related } = await api(`/api/insights/${encodeURIComponent(slug)}`, { quiet: true });
    render(article, related);
  } catch (err) {
    root.innerHTML = emptyState({
      title: err.status === 404 ? 'Article not found' : 'This article is unavailable right now',
      text: err.status === 404 ? 'It may have been moved or removed.' : err.message,
      actionLabel: 'Browse All Insights',
      actionHref: '/insights.html',
    });
  } finally {
    root.removeAttribute('aria-busy');
  }
}

load();
