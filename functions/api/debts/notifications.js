export async function onRequest({ request, env, data }) {
  const { user } = data;

  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const { results } = await env.DB.prepare(
      `SELECT d.id, d.name, d.phone, d.amount, d.paid_amount, d.due_date, d.service_name, d.status
       FROM debts d
       WHERE d.tenant_id = ? AND d.due_date IS NOT NULL AND d.due_date <= ? AND d.status != 'Paid'
       ORDER BY d.due_date ASC`
    ).bind(user.tenant_id, today).all();

    const rows = (results || []).map(r => {
      const diff = Math.floor((new Date(today) - new Date(r.due_date)) / 86400000);
      const remaining = parseFloat(r.amount) - parseFloat(r.paid_amount || 0);
      let message = '';
      if (diff === 0) message = `${r.name} — Payment Due Today ($${remaining.toFixed(2)})`;
      else if (diff > 0) message = `${r.name} — Payment Overdue by ${diff} day${diff > 1 ? 's' : ''} ($${remaining.toFixed(2)})`;
      return { ...r, message, days_overdue: diff, remaining, type: 'debt' };
    });

    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
