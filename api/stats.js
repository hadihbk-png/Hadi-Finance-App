// GET /api/stats -> public platform counters for the home page
import { queryOne } from './_lib/db.js';
import { route } from './_lib/http.js';

export default route({
  GET: async (req, res) => {
    const row = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM users)::int            AS members,
        (SELECT COUNT(*) FROM goals)::int            AS goals_created,
        (SELECT COUNT(*) FROM risk_assessments)::int AS assessments_completed
    `);
    res.status(200).json(row);
  },
});
