export async function onRequest({ request, env, data, params }) {
  const { user } = data;

  if (request.method === 'GET') {
    const invoice = await env.DB.prepare(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
       COALESCE((SELECT SUM(amount) FROM transactions WHERE customer_id = i.customer_id AND tenant_id = i.tenant_id), 0) as customer_balance
       FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.id = ? AND i.tenant_id = ?`
    ).bind(params.id, user.tenant_id).first();
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });
    const { results: items } = await env.DB.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ?`).bind(params.id).all();
    return Response.json({ ...invoice, items });
  }

  if (request.method === 'DELETE') {
    const invoice = await env.DB.prepare(
      `SELECT * FROM invoices WHERE id = ? AND tenant_id = ?`
    ).bind(params.id, user.tenant_id).first();
    if (!invoice) return Response.json({ error: 'Invoice not found' }, { status: 404 });

    // Soft delete: void the invoice + insert reversing ledger transaction
    await env.DB.batch([
      env.DB.prepare(`UPDATE invoices SET status = 'Voided', updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`)
        .bind(params.id, user.tenant_id),
      // Reversing entry: negative amount cancels the original debit
      env.DB.prepare(
        `INSERT INTO transactions (tenant_id, customer_id, type, amount, reference_id, notes) VALUES (?,?,?,?,?,?)`
      ).bind(user.tenant_id, invoice.customer_id, 'void', -invoice.total, invoice.id, 'Voided ' + invoice.invoice_number),
    ]);
    return Response.json({ message: 'Invoice voided' });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
