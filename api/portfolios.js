// GET /api/portfolios -> { portfolios, recommended, assessment }   (logged-in user only)
// `recommended` is the model portfolio for the user's latest risk assessment, or null.

import { query, queryOne } from './_lib/db.js';
import { route } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { RISK_PROFILES, RISK_PROFILE_SUMMARIES } from '../shared/finance.js';

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    const [portfolios, assessment] = await Promise.all([
      query('SELECT * FROM model_portfolios'),
      queryOne(
        'SELECT id, score, risk_profile, created_at FROM risk_assessments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [user.id]
      ),
    ]);
    portfolios.sort((a, b) => RISK_PROFILES.indexOf(a.risk_profile) - RISK_PROFILES.indexOf(b.risk_profile));
    const recommended = assessment ? portfolios.find((p) => p.risk_profile === assessment.risk_profile) || null : null;
    res.status(200).json({
      portfolios,
      recommended,
      assessment,
      summary: assessment ? RISK_PROFILE_SUMMARIES[assessment.risk_profile] : null,
    });
  },
});
