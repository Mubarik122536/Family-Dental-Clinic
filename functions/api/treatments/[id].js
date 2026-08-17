import { createDb } from '../_db.js';

export async function onRequest({ request, env, data, params }) {
  const db = createDb(env.DB, data.user.tenant_id);
  const id = params.id;

  if (request.method === 'PUT') {
    const { name, category, description, price, pricing_type, duration, status } = await request.json();
    const row = await db.first(
      `UPDATE treatments SET name=?, category=?, description=?, price=?, pricing_type=?, duration=?, status=? WHERE id=? RETURNING *`,
      [name, category, description, price, pricing_type || 'per_tooth', duration, status, id]
    );
    if (!row) return Response.json({ error: 'Treatment not found' }, { status: 404 });
    return Response.json(row);
  }

  if (request.method === 'DELETE') {
    await db.run(`DELETE FROM treatments WHERE id=?`, [id]);
    return Response.json({ message: 'Treatment deleted' });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
