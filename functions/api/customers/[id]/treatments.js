export async function onRequest({ request, env, data, params }) {
  const { user } = data;
  const customerId = params.id;

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const year = url.searchParams.get('year');
    let where = ['ct.tenant_id = ?', 'ct.customer_id = ?'], binds = [user.tenant_id, customerId];
    if (month) { where.push('ct.treatment_month = ?'); binds.push(parseInt(month)); }
    if (year) { where.push('ct.treatment_year = ?'); binds.push(parseInt(year)); }
    const { results } = await env.DB.prepare(
      `SELECT ct.*, t.name as treatment_name, t.category as treatment_category
       FROM customer_treatments ct LEFT JOIN treatments t ON ct.treatment_id = t.id
       WHERE ${where.join(' AND ')} ORDER BY ct.treatment_date DESC`
    ).bind(...binds).all();
    return Response.json(results);
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { treatment_id, service_name, teeth, quantity, unit_price, discount, treatment_date, notes } = body;

    // ── Input validation ──────────────────────────────────────────────
    if (!service_name?.trim()) {
      return Response.json({ error: 'Service name is required' }, { status: 400 });
    }
    const parsedPrice = parseFloat(unit_price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return Response.json({ error: 'Unit price must be a positive number' }, { status: 400 });
    }
    const qty = Math.max(1, parseInt(quantity) || 1);
    const disc = Math.max(0, parseFloat(discount) || 0);

    // Round to 2 decimal places
    const safePrice = Math.round(parsedPrice * 100) / 100;
    const subtotal = Math.round(safePrice * qty * 100) / 100;
    const total = Math.round(Math.max(0, subtotal - disc) * 100) / 100;

    // Prevent discount from exceeding subtotal
    if (disc > subtotal) {
      return Response.json({ error: `Discount ($${disc}) cannot exceed subtotal ($${subtotal})` }, { status: 400 });
    }

    const d = treatment_date ? new Date(treatment_date) : new Date();
    const tMonth = d.getMonth() + 1;
    const tYear = d.getFullYear();
    const teethStr = teeth ? JSON.stringify(teeth) : null;

    try {
      const row = await env.DB.prepare(
        `INSERT INTO customer_treatments (tenant_id, customer_id, treatment_id, service_name, teeth, quantity, unit_price, total, discount, treatment_date, treatment_month, treatment_year, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *`
      ).bind(
        user.tenant_id, customerId, treatment_id || null, service_name.trim(),
        teethStr, qty, safePrice, total, disc,
        treatment_date || new Date().toISOString().split('T')[0],
        tMonth, tYear, notes || null
      ).first();

      // Increment customer balance
      await env.DB.prepare(
        `UPDATE customers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
      ).bind(total, customerId, user.tenant_id).run();

      return Response.json(row, { status: 201 });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
