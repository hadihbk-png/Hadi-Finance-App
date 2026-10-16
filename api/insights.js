// GET /api/insights           -> article list (no bodies) + categories
// GET /api/insights/:slug     -> one full article + related articles
// (/api/insights/:slug is rewritten to /api/insights?slug=:slug in vercel.json)

import { query, queryOne } from './_lib/db.js';
import { route, HttpError } from './_lib/http.js';

const LIST_COLUMNS = 'id, title, slug, category, summary, author, read_minutes, image_url, published_at';

export default route({
  GET: async (req, res) => {
    const slug = req.query.slug;
    if (slug) {
      if (!/^[a-z0-9-]{1,200}$/.test(String(slug))) throw new HttpError(404, 'Article not found.');
      const article = await queryOne(`SELECT ${LIST_COLUMNS}, body FROM insights WHERE slug = $1`, [slug]);
      if (!article) throw new HttpError(404, 'Article not found.');
      const related = await query(
        `SELECT ${LIST_COLUMNS} FROM insights WHERE slug <> $1
         ORDER BY (category = $2) DESC, published_at DESC LIMIT 3`,
        [slug, article.category]
      );
      return res.status(200).json({ article, related });
    }
    const insights = await query(`SELECT ${LIST_COLUMNS} FROM insights ORDER BY published_at DESC`);
    const categories = [...new Set(insights.map((i) => i.category))];
    res.status(200).json({ insights, categories });
  },
});
