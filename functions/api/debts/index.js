export async function onRequest({ request, env, data }) {
  const { user } = data;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    let where = ['d.tenant_id = ?'], params = [user.tenant_id];
    if (search) { where.push(`(d.name LIKE ? OR d.phone LIKE ? OR d.service_name LIKE ?)`); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (status && status !== 'All') {
      if (status === 'Unpaid') {
        where.push(`(d.status = 'Unpaid' OR d.status = 'Partial')`);
      } else {
        where.push(`d.status = ?`); params.push(status);
      }
    }
    const { results } = await env.DB.prepare(
      `SELECT d.*, t.name as treatment_name,
        COALESCE(d.paid_amount, 0) as paid_amount,
        COALESCE(dp.payment_count, 0) as payment_count
       FROM debts d 
       LEFT JOIN treatments t ON d.treatment_id = t.id
       LEFT JOIN (
         SELECT debt_id, COUNT(*) as payment_count 
         FROM debt_payments 
         WHERE tenant_id = ? 
         GROUP BY debt_id
       ) dp ON dp.debt_id = d.id
       WHERE ${where.join(' AND ')} ORDER BY d.created_at DESC`
    ).bind(user.tenant_id, ...params).all();
    return Response.json(results || []);
  }

  if (request.method === 'POST') {
    try {
      const { name, phone, amount, treatment_id, service_name, teeth, due_date } = await request.json();
      if (!name || !phone || amount === undefined || !service_name) {
        return Response.json({ error: 'Name, phone, amount, and service are required' }, { status: 400 });
      }
      const row = await env.DB.prepare(
        `INSERT INTO debts (tenant_id, name, phone, amount, treatment_id, service_name, teeth, due_date) VALUES (?,?,?,?,?,?,?,?) RETURNING *`
      ).bind(user.tenant_id, name, phone, parseFloat(amount), treatment_id || null, service_name, teeth || null, due_date || null).first();
      return Response.json(row, { status: 201 });
    } catch (e) {
      return Response.json({ error: `Database error: ${e.message}` }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
