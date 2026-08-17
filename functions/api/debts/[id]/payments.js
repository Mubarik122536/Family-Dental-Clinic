export async function onRequest({ request, env, data, params }) {
  const { user } = data;
  const debtId = params.id;

  // GET: list payments for a debt
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT * FROM debt_payments WHERE debt_id = ? AND tenant_id = ? ORDER BY created_at DESC`
    ).bind(debtId, user.tenant_id).all();
    return Response.json(results);
  }

  // POST: record a partial payment
  if (request.method === 'POST') {
    try {
      const { amount, method, notes } = await request.json();
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) {
        return Response.json({ error: 'Amount must be a positive number' }, { status: 400 });
      }

      // Get the debt to validate
      const debt = await env.DB.prepare(
        `SELECT * FROM debts WHERE id = ? AND tenant_id = ?`
      ).bind(debtId, user.tenant_id).first();
      if (!debt) return Response.json({ error: 'Debt not found' }, { status: 404 });

      const remaining = parseFloat(debt.amount) - parseFloat(debt.paid_amount || 0);
      if (amt > remaining + 0.01) {
        return Response.json({ error: `Amount exceeds remaining balance of $${remaining.toFixed(2)}` }, { status: 400 });
      }

      // Insert payment
      const payment = await env.DB.prepare(
        `INSERT INTO debt_payments (tenant_id, debt_id, amount, method, notes) VALUES (?,?,?,?,?) RETURNING *`
      ).bind(user.tenant_id, debtId, amt, method || 'Cash', notes || null).first();

      // Update debt paid_amount and auto-set status
      const newPaid = parseFloat(debt.paid_amount || 0) + amt;
      const newStatus = newPaid >= parseFloat(debt.amount) ? 'Paid' : 'Partial';
      await env.DB.prepare(
        `UPDATE debts SET paid_amount = ?, status = ? WHERE id = ? AND tenant_id = ?`
      ).bind(Math.round(newPaid * 100) / 100, newStatus, debtId, user.tenant_id).run();

      return Response.json({ payment, newPaid, newStatus }, { status: 201 });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
