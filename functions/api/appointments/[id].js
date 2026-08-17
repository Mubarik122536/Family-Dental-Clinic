export async function onRequest({ request, env, data, params }) {
  const id = params.id;
  const { user } = data;

  if (request.method === 'PUT') {
    const { customer_id, visit_date, next_visit, reminder } = await request.json();

    if (next_visit && visit_date && next_visit < visit_date) {
      return Response.json({ error: 'Next visit must be on or after visit date' }, { status: 400 });
    }

    try {
      const row = await env.DB.prepare(
        `UPDATE appointments SET customer_id=COALESCE(?,customer_id), visit_date=COALESCE(?,visit_date), next_visit=COALESCE(?,next_visit), reminder=COALESCE(?,reminder)
         WHERE id=? AND tenant_id=? RETURNING *`
      ).bind(
        customer_id || null, visit_date || null, next_visit || null,
        reminder !== undefined ? (reminder ? 1 : 0) : null,
        id, user.tenant_id
      ).first();
      if (!row) return Response.json({ error: 'Appointment not found' }, { status: 404 });
      return Response.json(row);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  if (request.method === 'DELETE') {
    try {
      await env.DB.prepare(`DELETE FROM appointments WHERE id=? AND tenant_id=?`)
        .bind(id, user.tenant_id).run();
      return Response.json({ message: 'Appointment deleted' });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
