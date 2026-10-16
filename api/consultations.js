// POST /api/consultations -> save a booking request (public; linked to the user when logged in)
// GET  /api/consultations -> the logged-in user's own requests

import { query, queryOne } from './_lib/db.js';
import { route, body, text, email, phone, date, integer, ValidationError } from './_lib/http.js';
import { getSessionUser, requireUser } from './_lib/auth.js';

const COLUMNS = `c.id, c.name, c.email, c.phone, c.service_id, s.name AS service_name,
  to_char(c.preferred_date, 'YYYY-MM-DD') AS preferred_date, c.message, c.status, c.created_at`;

export default route({
  GET: async (req, res) => {
    const user = await requireUser(req);
    const rows = await query(
      `SELECT ${COLUMNS} FROM consultation_requests c LEFT JOIN services s ON s.id = c.service_id
       WHERE c.user_id = $1 ORDER BY c.created_at DESC, c.id DESC LIMIT 20`,
      [user.id]
    );
    res.status(200).json({ consultations: rows });
  },

  POST: async (req, res) => {
    const b = body(req);
    // Honeypot field: real visitors never fill it in.
    if (b.honeypot) return res.status(201).json({ consultation: { id: 0 } });

    const session = await getSessionUser(req);
    const data = {
      name: text(b.name, 'name', 'Full name', { min: 2, max: 120 }),
      email: email(b.email),
      phone: phone(b.phone),
      service_id: integer(b.service_id, 'service_id', 'Service', { min: 1, required: false }),
      preferred_date: date(b.preferred_date, 'preferred_date', 'Preferred date', { required: false, future: true, maxYearsAhead: 1 }),
      message: text(b.message, 'message', 'Message', { required: false, max: 2000 }),
    };
    if (data.service_id) {
      const exists = await queryOne('SELECT id FROM services WHERE id = $1', [data.service_id]);
      if (!exists) throw new ValidationError('Please choose a service from the list.', 'service_id');
    }

    const row = await queryOne(
      `INSERT INTO consultation_requests (user_id, name, email, phone, service_id, preferred_date, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
      [session ? session.id : null, data.name, data.email, data.phone, data.service_id, data.preferred_date, data.message]
    );
    res.status(201).json({ consultation: row });
  },
});
