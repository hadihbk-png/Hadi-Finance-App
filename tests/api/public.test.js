import { describe, it, expect } from 'vitest';
import { guest, newUser } from '../helpers.js';

describe('GET /api/stats', () => {
  it('returns the three counters as whole numbers', async () => {
    const res = await guest().get('/api/stats');
    expect(res.status).toBe(200);
    for (const key of ['members', 'goals_created', 'assessments_completed']) {
      expect(typeof res.body[key]).toBe('number');
      expect(Number.isInteger(res.body[key])).toBe(true);
      expect(res.body[key]).toBeGreaterThanOrEqual(0);
    }
  });

  it('counts new members', async () => {
    const before = (await guest().get('/api/stats')).body.members;
    await newUser('stats');
    const after = (await guest().get('/api/stats')).body.members;
    expect(after).toBe(before + 1);
  });

  it('rejects other methods', async () => {
    expect((await guest().delete('/api/stats')).status).toBe(405);
  });
});

describe('GET /api/services', () => {
  it('returns the 6 seeded services in order, with AED prices and deliverables', async () => {
    const res = await guest().get('/api/services');
    expect(res.status).toBe(200);
    const names = res.body.services.map((s) => s.name);
    expect(names).toEqual(['Financial Health Check', 'Retirement Planning', 'Investment Advisory', 'Goal Planning', 'Debt Management', 'Wealth Review']);
    for (const s of res.body.services) {
      expect(Number(s.starting_price)).toBeGreaterThan(0);
      expect(s.duration_minutes).toBeGreaterThan(0);
      expect(s.deliverables.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('GET /api/insights', () => {
  it('returns 9 articles without bodies, newest first, across 3-4 categories', async () => {
    const res = await guest().get('/api/insights');
    expect(res.status).toBe(200);
    expect(res.body.insights).toHaveLength(9);
    expect(res.body.categories.length).toBeGreaterThanOrEqual(3);
    expect(res.body.categories.length).toBeLessThanOrEqual(4);
    for (const a of res.body.insights) {
      expect(a).not.toHaveProperty('body');
      expect(a.slug).toMatch(/^[a-z0-9-]+$/);
    }
    const dates = res.body.insights.map((a) => new Date(a.published_at).getTime());
    expect([...dates].sort((x, y) => y - x)).toEqual(dates);
  });

  it('returns a full article by slug with related articles', async () => {
    const res = await guest().get('/api/insights/end-of-service-gratuity');
    expect(res.status).toBe(200);
    expect(res.body.article.title).toBe('Understanding Your End-of-Service Gratuity');
    expect(res.body.article.body).toMatch(/<p>/);
    expect(res.body.related).toHaveLength(3);
    expect(res.body.related.map((r) => r.slug)).not.toContain('end-of-service-gratuity');
  });

  it.each(['does-not-exist', 'DROP TABLE', '..%2F..%2Fetc', 'a'.repeat(250)])('returns 404 for unknown slug %j', async (slug) => {
    const res = await guest().get(`/api/insights/${encodeURIComponent(slug)}`);
    expect(res.status).toBe(404);
  });
});

describe('routing', () => {
  it('returns 404 for unknown routes and private helper files', async () => {
    expect((await guest().get('/api/nope')).status).toBe(404);
    expect((await guest().get('/api/_lib/db')).status).toBe(404);
    expect((await guest().get('/api/_lib/http.js')).status).toBe(404);
  });

  it('rejects malformed JSON with a clear 400', async () => {
    const res = await guest().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid JSON/);
  });
});

describe('request format', () => {
  it('refuses non-JSON bodies on data-changing requests', async () => {
    const res = await guest().post('/api/consultations').set('Content-Type', 'text/plain').send('{"name":"Form Post","email":"x@finora.test"}');
    expect(res.status).toBe(415);
    const form = await guest().post('/api/auth/login').type('form').send({ email: 'a@finora.test', password: 'x' });
    expect(form.status).toBe(415);
  });
});
