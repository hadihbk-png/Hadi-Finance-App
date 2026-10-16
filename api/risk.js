// GET  /api/risk -> { questions, history }      (logged-in user only)
// POST /api/risk  { answers: { [questionId]: optionIndex } } -> { assessment, portfolio }
// Scores are always calculated here from the points stored in the database.

import { query, queryOne } from './_lib/db.js';
import { route, body, ValidationError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { riskProfileForScore, RISK_PROFILE_SUMMARIES } from '../shared/finance.js';

const HISTORY_COLUMNS = 'id, score, risk_profile, created_at';

async function loadQuestions() {
  return query('SELECT id, question, order_index, options FROM risk_questions ORDER BY order_index');
}

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    const [questions, history] = await Promise.all([
      loadQuestions(),
      query(`SELECT ${HISTORY_COLUMNS} FROM risk_assessments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [user.id]),
    ]);
    res.status(200).json({
      // Points stay on the server; the page only needs the labels.
      questions: questions.map((q) => ({
        id: q.id,
        question: q.question,
        order_index: q.order_index,
        options: q.options.map((o) => ({ label: o.label })),
      })),
      history,
      summaries: RISK_PROFILE_SUMMARIES,
    });
  },

  POST: async (req, res) => {
    const user = await requireUser(req);
    const answers = body(req).answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new ValidationError('Please answer every question.', 'answers');
    }

    const questions = await loadQuestions();
    if (!questions.length) throw new ValidationError('The questionnaire is not available yet.');

    let total = 0, min = 0, max = 0;
    const saved = questions.map((q) => {
      const raw = answers[q.id] ?? answers[String(q.id)];
      const index = Number(raw);
      if (!Number.isInteger(index) || index < 0 || index >= q.options.length) {
        throw new ValidationError(`Please answer question ${q.order_index}.`, `q${q.id}`);
      }
      const points = q.options.map((o) => Number(o.points));
      total += points[index];
      min += Math.min(...points);
      max += Math.max(...points);
      return { question_id: q.id, option_index: index, points: points[index] };
    });

    const score = max > min ? Math.round(((total - min) / (max - min)) * 100) : 0;
    const risk_profile = riskProfileForScore(score);

    const assessment = await queryOne(
      `INSERT INTO risk_assessments (user_id, answers, score, risk_profile)
       VALUES ($1, $2::jsonb, $3, $4) RETURNING ${HISTORY_COLUMNS}`,
      [user.id, JSON.stringify(saved), score, risk_profile]
    );
    const portfolio = await queryOne('SELECT * FROM model_portfolios WHERE risk_profile = $1', [risk_profile]);
    res.status(201).json({ assessment, portfolio, summary: RISK_PROFILE_SUMMARIES[risk_profile] });
  },
});
