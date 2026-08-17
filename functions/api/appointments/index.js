export async function onRequest({ request, env, data }) {
  const { user } = data;

  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        `SELECT a.id, a.customer_id, a.visit_date, a.next_visit, a.reminder, a.created_at,
                c.name as customer_name, c.phone as customer_phone
         FROM appointments a
         LEFT JOIN customers c ON a.customer_id = c.id
         WHERE a.tenant_id = ?
         ORDER BY a.next_visit DESC, a.id DESC`
      ).bind(user.tenant_id).all();

      const today = new Date().toISOString().split('T')[0];
      const rows = (results || []).map(r => {
        let status = 'Upcoming';
        if (r.next_visit === today) status = 'Today';
        else if (r.next_visit < today) status = 'Overdue';
        return { ...r, status };
      });

      return Response.json(rows);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { customer_id, visit_date, next_visit, reminder } = body;

    if (!customer_id) return Response.json({ error: 'Customer ID is required' }, { status: 400 });
    if (!visit_date) return Response.json({ error: 'Visit date is required' }, { status: 400 });
    if (!next_visit) return Response.json({ error: 'Next visit date is required' }, { status: 400 });
    if (next_visit < visit_date) return Response.json({ error: 'Next visit must be on or after visit date' }, { status: 400 });

    // Validate customer exists
    const customer = await env.DB.prepare(
      `SELECT id FROM customers WHERE id = ? AND tenant_id = ?`
    ).bind(parseInt(customer_id), user.tenant_id).first();
    if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

    // ── Idempotency: check if this exact (customer, visit_date) already exists ──
    // This covers: slow network retries, double-submit, batch re-runs
    const existing = await env.DB.prepare(
      `SELECT * FROM appointments WHERE tenant_id = ? AND customer_id = ? AND visit_date = ?`
    ).bind(user.tenant_id, parseInt(customer_id), visit_date).first();
    if (existing) {
      // Return the existing record — not an error, de-duplicate silently
      return Response.json({ ...existing, _idempotent: true }, { status: 200 });
    }

    try {
      const row = await env.DB.prepare(
        `INSERT INTO appointments (tenant_id, customer_id, visit_date, next_visit, reminder)
         VALUES (?,?,?,?,?) RETURNING *`
      ).bind(user.tenant_id, parseInt(customer_id), visit_date, next_visit, reminder !== undefined ? (reminder ? 1 : 0) : 1).first();
      return Response.json(row, { status: 201 });
    } catch (e) {
      // ── Fallback: UNIQUE constraint fired by concurrent request ──────
      if (e.message?.includes('UNIQUE')) {
        const conflict = await env.DB.prepare(
          `SELECT * FROM appointments WHERE tenant_id = ? AND customer_id = ? AND visit_date = ?`
        ).bind(user.tenant_id, parseInt(customer_id), visit_date).first();
        if (conflict) return Response.json({ ...conflict, _idempotent: true }, { status: 200 });
        return Response.json({ error: 'Duplicate appointment for this visit date' }, { status: 409 });
      }
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
