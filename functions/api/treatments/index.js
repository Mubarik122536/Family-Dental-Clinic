import { createDb } from '../_db.js';

export async function onRequest({ request, env, data }) {
  const db = createDb(env.DB, data.user.tenant_id);
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const category = url.searchParams.get('category') || '';
    const sql = category && category !== 'All'
      ? `SELECT * FROM treatments WHERE category = ? ORDER BY category, name`
      : `SELECT * FROM treatments ORDER BY category, name`;
    const params = category && category !== 'All' ? [category] : [];
    return Response.json(await db.all(sql, params));
  }

  if (request.method === 'POST') {
    const { name, category, description, price, pricing_type, duration, status } = await request.json();
    const row = await env.DB.prepare(
      `INSERT INTO treatments (tenant_id, name, category, description, price, pricing_type, duration, status) VALUES (?,?,?,?,?,?,?,?) RETURNING *`
    ).bind(data.user.tenant_id, name, category, description || null, price, pricing_type || 'per_tooth', duration || 30, status || 'Active').first();
    return Response.json(row, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
