export async function onRequest({ request, env, data }) {
  const { user } = data;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';
    let where = [`i.tenant_id = ?`], params = [user.tenant_id];
    if (search) { where.push(`(c.name LIKE ? OR i.invoice_number LIKE ?)`); params.push(`%${search}%`, `%${search}%`); }
    if (status && status !== 'All') { where.push(`i.status = ?`); params.push(status); }
    else { where.push(`i.status != 'Voided'`); }
    const { results } = await env.DB.prepare(
      `SELECT i.*, c.name as customer_name, c.phone as customer_phone
       FROM invoices i LEFT JOIN customers c ON i.customer_id = c.id
       WHERE ${where.join(' AND ')} ORDER BY i.created_at DESC`
    ).bind(...params).all();
    return Response.json(results);
  }

  if (request.method === 'POST') {
    const { customer_id, items, notes, due_date } = await request.json();
    const countRow = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM invoices WHERE tenant_id = ?`).bind(user.tenant_id).first();
    const invoiceNum = `INV-${new Date().getFullYear()}-${String(countRow.cnt + 1).padStart(3, '0')}`;
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    const invoiceRow = await env.DB.prepare(
      `INSERT INTO invoices (tenant_id, customer_id, invoice_number, due_date, subtotal, tax, total, notes) VALUES (?,?,?,?,?,0,?,?) RETURNING *`
    ).bind(user.tenant_id, customer_id, invoiceNum, due_date || null, subtotal, subtotal, notes || null).first();

    const stmts = items.map(item =>
      env.DB.prepare(`INSERT INTO invoice_items (invoice_id, treatment_id, description, quantity, unit_price, total) VALUES (?,?,?,?,?,?)`)
        .bind(invoiceRow.id, item.treatment_id || null, item.description, item.quantity, item.unit_price, item.unit_price * item.quantity)
    );
    // Ledger: record invoice as a debit transaction (positive = customer owes)
    stmts.push(env.DB.prepare(
      `INSERT INTO transactions (tenant_id, customer_id, type, amount, reference_id, notes) VALUES (?,?,?,?,?,?)`
    ).bind(user.tenant_id, customer_id, 'invoice', subtotal, invoiceRow.id, 'Invoice ' + invoiceNum));
    await env.DB.batch(stmts);

    return Response.json(invoiceRow, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
