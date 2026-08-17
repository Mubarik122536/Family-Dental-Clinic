export async function onRequest({ request, env, data }) {
  const { user } = data;

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    let where = [`p.tenant_id = ?`], params = [user.tenant_id];
    if (search) { where.push(`c.name LIKE ?`); params.push(`%${search}%`); }
    if (from) { where.push(`date(p.created_at) >= ?`); params.push(from); }
    if (to) { where.push(`date(p.created_at) <= ?`); params.push(to); }
    const { results } = await env.DB.prepare(
      `SELECT p.*, c.name as customer_name, c.phone as customer_phone
       FROM payments p LEFT JOIN customers c ON p.customer_id = c.id
       WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC`
    ).bind(...params).all();
    return Response.json(results || []);
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { customer_id, amount, method, notes, idempotency_key } = body;

    // ── Input validation ──────────────────────────────────────────────
    if (!customer_id) return Response.json({ error: 'Customer ID is required' }, { status: 400 });
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    // Round to 2 decimal places — prevent floating-point drift
    const safeAmount = Math.round(parsedAmount * 100) / 100;

    try {
      // ── Idempotency: if key matches an existing payment, return it ───
      // This handles retries, double-submits, slow network re-requests
      if (idempotency_key) {
        const existing = await env.DB.prepare(
          `SELECT * FROM payments WHERE idempotency_key = ? AND tenant_id = ?`
        ).bind(idempotency_key, user.tenant_id).first();
        if (existing) {
          // Already processed — return the original payment, not an error
          return Response.json({ ...existing, treatmentItems: [], _idempotent: true }, { status: 200 });
        }
      }

      // ── Server-side: verify customer exists ───────────────────────────
      const customer = await env.DB.prepare(
        `SELECT id FROM customers WHERE id = ? AND tenant_id = ?`
      ).bind(customer_id, user.tenant_id).first();
      if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

      // ── Server-side: calculate real remaining balance dynamically ────
      const balRow = await env.DB.prepare(
        `SELECT
           COALESCE((SELECT SUM(total) FROM customer_treatments WHERE customer_id=? AND tenant_id=?),0)
           - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id=? AND tenant_id=?),0)
           as remaining`
      ).bind(customer_id, user.tenant_id, customer_id, user.tenant_id).first();

      const remaining = Math.max(0, parseFloat(balRow?.remaining || 0));
      if (remaining <= 0) {
        return Response.json({ error: 'This account is fully paid. No payment needed.' }, { status: 400 });
      }
      if (safeAmount > remaining + 0.01) { // 0.01 tolerance for floating-point
        return Response.json({
          error: `Payment of $${safeAmount.toFixed(2)} exceeds remaining balance of $${remaining.toFixed(2)}`
        }, { status: 400 });
      }

      // ── Cap to remaining balance ──────────────────────────────────────
      const finalAmount = Math.min(safeAmount, remaining);

      // ── Get treatment items for receipt ──────────────────────────────
      let treatmentItems = [];
      try {
        const { results: txs } = await env.DB.prepare(
          `SELECT service_name as name, quantity as qty, unit_price as price, total
           FROM customer_treatments WHERE customer_id = ? AND tenant_id = ?
           ORDER BY treatment_date DESC LIMIT 20`
        ).bind(customer_id, user.tenant_id).all();
        treatmentItems = txs || [];
      } catch (_) { treatmentItems = []; }

      // ── Insert payment with idempotency key ───────────────────────────
      const payRow = await env.DB.prepare(
        `INSERT INTO payments (tenant_id, customer_id, amount, method, status, notes, idempotency_key)
         VALUES (?,?,?,?,?,?,?) RETURNING *`
      ).bind(
        user.tenant_id, customer_id, finalAmount,
        method || 'Cash', 'Completed', notes || null,
        idempotency_key || null
      ).first();

      // ── Update customer balance (clamp to 0) ──────────────────────────
      await env.DB.prepare(
        `UPDATE customers SET balance = MAX(0, balance - ?), updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
      ).bind(finalAmount, customer_id, user.tenant_id).run();

      return Response.json({ ...payRow, treatmentItems }, { status: 201 });

    } catch (e) {
      // ── If DB unique constraint fires (true race), return early ───────
      if (e.message?.includes('UNIQUE') && idempotency_key) {
        const existing = await env.DB.prepare(
          `SELECT * FROM payments WHERE idempotency_key = ? AND tenant_id = ?`
        ).bind(idempotency_key, user.tenant_id).first();
        if (existing) return Response.json({ ...existing, treatmentItems: [], _idempotent: true }, { status: 200 });
      }
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
