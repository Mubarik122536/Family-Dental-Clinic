export async function onRequest({ env, data }) {
  const tid = data.user.tenant_id;

  // Fetch customer treatment payments
  let paymentRows = [];
  try {
    const { results } = await env.DB.prepare(`
      SELECT strftime('%b', created_at) as month,
             strftime('%Y-%m', created_at) as month_sort,
             COALESCE(amount, 0) as revenue
      FROM payments
      WHERE status = 'Completed' AND tenant_id = ?
        AND created_at >= datetime('now', '-6 months')
    `).bind(tid).all();
    paymentRows = results || [];
  } catch (_) { /* ignore */ }

  // Fetch paid debts
  let debtRows = [];
  try {
    const { results } = await env.DB.prepare(`
      SELECT strftime('%b', created_at) as month,
             strftime('%Y-%m', created_at) as month_sort,
             COALESCE(amount, 0) as revenue
      FROM debts
      WHERE status = 'Paid' AND tenant_id = ?
        AND created_at >= datetime('now', '-6 months')
    `).bind(tid).all();
    debtRows = results || [];
  } catch (_) { /* debts table may not exist */ }

  // Fetch cash transactions (walk-in sales)
  let cashRows = [];
  try {
    const { results } = await env.DB.prepare(`
      SELECT strftime('%b', created_at) as month,
             strftime('%Y-%m', created_at) as month_sort,
             COALESCE(total, 0) as revenue
      FROM cash_transactions
      WHERE tenant_id = ?
        AND created_at >= datetime('now', '-6 months')
    `).bind(tid).all();
    cashRows = results || [];
  } catch (_) { /* cash_transactions table may not exist */ }

  // Merge all sets in JS — group by month_sort
  const monthMap = {};
  for (const row of [...paymentRows, ...debtRows, ...cashRows]) {
    if (!monthMap[row.month_sort]) {
      monthMap[row.month_sort] = { month: row.month, month_sort: row.month_sort, revenue: 0 };
    }
    monthMap[row.month_sort].revenue += parseFloat(row.revenue || 0);
  }

  const combined = Object.values(monthMap).sort((a, b) => a.month_sort.localeCompare(b.month_sort));
  return Response.json(combined);
}
