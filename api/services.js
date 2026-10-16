// GET /api/services -> public list of advisory services
import { query } from './_lib/db.js';
import { route } from './_lib/http.js';

export default route({
  GET: async (req, res) => {
    const services = await query(
      `SELECT id, name, short_description, details, starting_price, duration_minutes, order_index
       FROM services ORDER BY order_index, id`
    );
    res.status(200).json({
      services: services.map((s) => ({ ...s, deliverables: s.details.split('\n').map((l) => l.trim()).filter(Boolean) })),
    });
  },
});
