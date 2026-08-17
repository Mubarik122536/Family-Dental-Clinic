export async function onRequest({ request, env, data }) {
  const { user } = data;
  const tid = user.tenant_id;

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'all'; // today, month, all, custom
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';

    let dateFilter = '';
    if (period === 'today') {
      dateFilter = `AND date = date('now')`;
    } else if (period === 'month') {
      dateFilter = `AND date >= date('now', 'start of month')`;
    } else if (period === 'custom' && from && to) {
      dateFilter = `AND date >= '${from}' AND date <= '${to}'`;
    } else if (period === 'custom' && from) {
      dateFilter = `AND date >= '${from}'`;
    } else if (period === 'custom' && to) {
      dateFilter = `AND date <= '${to}'`;
    }

    try {
      const { results } = await env.DB.prepare(
        `SELECT * FROM expenses WHERE tenant_id = ? ${dateFilter} ORDER BY date DESC, created_at DESC`
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

    const { amount, description, date } = body;
    if (!amount || !description) {
      return Response.json({ error: 'Amount and description are required' }, { status: 400 });
    }
    const safeAmount = Math.round(parseFloat(amount) * 100) / 100;
    if (safeAmount <= 0) {
      return Response.json({ error: 'Amount must be positive' }, { status: 400 });
    }

    try {
      const row = await env.DB.prepare(
        `INSERT INTO expenses (tenant_id, amount, description, date) VALUES (?,?,?,?) RETURNING *`
      ).bind(tid, safeAmount, description, date || new Date().toISOString().split('T')[0]).first();
      return Response.json(row, { status: 201 });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
