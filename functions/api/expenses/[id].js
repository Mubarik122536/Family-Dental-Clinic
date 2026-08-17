export async function onRequest({ request, env, data, params }) {
  const { user } = data;
  const tid = user.tenant_id;
  const id = params.id;

  if (request.method === 'DELETE') {
    try {
      await env.DB.prepare(
        `DELETE FROM expenses WHERE id = ? AND tenant_id = ?`
      ).bind(id, tid).run();
      return Response.json({ success: true });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  if (request.method === 'PUT') {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { amount, description, date } = body;
    if (!amount || !description) {
      return Response.json({ error: 'Amount and description are required' }, { status: 400 });
    }

    try {
      const row = await env.DB.prepare(
        `UPDATE expenses SET amount = ?, description = ?, date = ? WHERE id = ? AND tenant_id = ? RETURNING *`
      ).bind(parseFloat(amount), description, date || new Date().toISOString().split('T')[0], id, tid).first();
      return Response.json(row);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
