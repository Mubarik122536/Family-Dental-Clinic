export async function onRequest({ request, env, data }) {
  const { user } = data;
  const tid = user.tenant_id;

  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        `SELECT * FROM cash_transactions WHERE tenant_id = ? ORDER BY created_at DESC`
      ).bind(tid).all();
      return Response.json(results || []);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, phone, services, teeth, subtotal, discount, total, method } = body;
    if (!services) return Response.json({ error: 'Services are required' }, { status: 400 });
    const safeTotal = Math.round(parseFloat(total || 0) * 100) / 100;
    if (safeTotal <= 0) return Response.json({ error: 'Total must be positive' }, { status: 400 });

    try {
      const row = await env.DB.prepare(
        `INSERT INTO cash_transactions (tenant_id, name, phone, services, teeth, subtotal, discount, total, method)
         VALUES (?,?,?,?,?,?,?,?,?) RETURNING *`
      ).bind(
        tid, name || null, phone || null, services,
        teeth || null, parseFloat(subtotal || 0),
        parseFloat(discount || 0), safeTotal, method || 'Cash'
      ).first();
      return Response.json(row, { status: 201 });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  // DELETE — admin can delete specific records or bulk by date
  if (request.method === 'DELETE') {
    const url = new URL(request.url);
    const before = url.searchParams.get('before'); // e.g. "2026-03-01"

    if (before) {
      // Bulk delete all records before a date
      try {
        const result = await env.DB.prepare(
          `DELETE FROM cash_transactions WHERE tenant_id = ? AND date(created_at) < ?`
        ).bind(tid, before).run();
        return Response.json({ success: true, deleted: result.meta?.changes || 0 });
      } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    return Response.json({ error: 'Provide ?before=YYYY-MM-DD to bulk delete' }, { status: 400 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
