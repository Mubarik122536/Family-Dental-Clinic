export async function onRequest({ request, env, data }) {
  const { user } = data;
  const tid = user.tenant_id;

  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'all'; // today, month, all, custom
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';

  let dateFilter = '';
  if (period === 'today') {
    dateFilter = `AND date(created_at) = date('now')`;
  } else if (period === 'month') {
    dateFilter = `AND date(created_at) >= date('now', 'start of month')`;
  } else if (period === 'custom' && from && to) {
    dateFilter = `AND date(created_at) >= '${from}' AND date(created_at) <= '${to}'`;
  } else if (period === 'custom' && from) {
    dateFilter = `AND date(created_at) >= '${from}'`;
  } else if (period === 'custom' && to) {
    dateFilter = `AND date(created_at) <= '${to}'`;
  }

  let expDateFilter = '';
  if (period === 'today') {
    expDateFilter = `AND date = date('now')`;
  } else if (period === 'month') {
    expDateFilter = `AND date >= date('now', 'start of month')`;
  } else if (period === 'custom' && from && to) {
    expDateFilter = `AND date >= '${from}' AND date <= '${to}'`;
  } else if (period === 'custom' && from) {
    expDateFilter = `AND date >= '${from}'`;
  } else if (period === 'custom' && to) {
    expDateFilter = `AND date <= '${to}'`;
  }

  try {
    // Income from Braces (customer_treatments -> payments on customer accounts)
    const bracesIncome = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE tenant_id = ? ${dateFilter}`
    ).bind(tid).first();

    // Income from Debts (debt_payments)
    const debtIncome = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM debt_payments WHERE tenant_id = ? ${dateFilter}`
    ).bind(tid).first();

    // Income from Cash (cash_transactions)
    const cashIncome = await env.DB.prepare(
      `SELECT COALESCE(SUM(total), 0) as total FROM cash_transactions WHERE tenant_id = ? ${dateFilter}`
    ).bind(tid).first();

    // Total Expenses
    const totalExpenses = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE tenant_id = ? ${expDateFilter}`
    ).bind(tid).first();

    const braces = parseFloat(bracesIncome?.total || 0);
    const debt = parseFloat(debtIncome?.total || 0);
    const cash = parseFloat(cashIncome?.total || 0);
    const expenses = parseFloat(totalExpenses?.total || 0);
    const grandTotal = braces + debt + cash;
    const netProfit = grandTotal - expenses;

    return Response.json({
      braces,
      debt,
      cash,
      grandTotal,
      expenses,
      netProfit,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
