export async function onRequest({ request, env, data, params }) {
  const { user } = data;
  const id = params.id;

  if (request.method === 'PUT') {
    const { name, phone, amount, treatment_id, service_name, status, teeth, due_date } = await request.json();
    const row = await env.DB.prepare(
      `UPDATE debts SET name=?, phone=?, amount=?, treatment_id=?, service_name=?, status=?, teeth=?, due_date=? WHERE id=? AND tenant_id=? RETURNING *`
    ).bind(name, phone, parseFloat(amount), treatment_id || null, service_name, status || 'Unpaid', teeth || null, due_date || null, id, user.tenant_id).first();
    if (!row) return Response.json({ error: 'Debt not found' }, { status: 404 });
    return Response.json(row);
  }

  if (request.method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM debts WHERE id = ? AND tenant_id = ?`).bind(id, user.tenant_id).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
