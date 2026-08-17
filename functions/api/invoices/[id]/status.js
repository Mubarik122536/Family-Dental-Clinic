export async function onRequest({ request, env, data, params }) {
  if (request.method !== 'PUT') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const { status } = await request.json();
  const row = await env.DB.prepare(
    `UPDATE invoices SET status=?, updated_at=datetime('now') WHERE id=? AND tenant_id=? RETURNING *`
  ).bind(status, params.id, data.user.tenant_id).first();
  if (!row) return Response.json({ error: 'Invoice not found' }, { status: 404 });
  return Response.json(row);
}
