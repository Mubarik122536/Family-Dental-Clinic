import { createDb } from '../_db.js';

export async function onRequest({ request, env, data, params }) {
  const db = createDb(env.DB, data.user.tenant_id);
  const id = params.id;

  if (request.method === 'GET') {
    const row = await db.first(`SELECT * FROM customers WHERE id = ?`, [id]);
    if (!row) return Response.json({ error: 'Customer not found' }, { status: 404 });
    return Response.json(row);
  }

  if (request.method === 'PUT') {
    const { name, phone, notes, status } = await request.json();
    try {
      const row = await db.first(
        `UPDATE customers SET name=?, phone=?, notes=?, status=?, updated_at=datetime('now') WHERE id=? RETURNING *`,
        [name, phone, notes, status, id]
      );
      if (!row) return Response.json({ error: 'Customer not found' }, { status: 404 });
      return Response.json(row);
    } catch (e) {
      if (e.message?.includes('UNIQUE')) return Response.json({ error: 'Phone number already exists' }, { status: 400 });
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  if (request.method === 'DELETE') {
    const row = await db.first(`DELETE FROM customers WHERE id=? RETURNING *`, [id]);
    if (!row) return Response.json({ error: 'Customer not found' }, { status: 404 });
    return Response.json({ message: 'Customer deleted', customer: row });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
