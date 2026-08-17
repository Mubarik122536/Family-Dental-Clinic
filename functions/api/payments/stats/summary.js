export async function onRequest({ env, data }) {
  const tid = data.user.tenant_id;

  // -- Payments summary --
  let totalReceived = 0, totalPending = 0, totalRefunded = 0, totalTransactions = 0;
  try {
    const row = await env.DB.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN status='Completed' THEN amount ELSE 0 END),0) as total_received,
        COALESCE(SUM(CASE WHEN status='Pending'   THEN amount ELSE 0 END),0) as total_pending,
        COALESCE(SUM(CASE WHEN status='Refunded'  THEN amount ELSE 0 END),0) as total_refunded,
        COUNT(*) as total_transactions
       FROM payments WHERE tenant_id=?`
    ).bind(tid).first();
    totalReceived    = parseFloat(row.total_received   || 0);
    totalPending     = parseFloat(row.total_pending    || 0);
    totalRefunded    = parseFloat(row.total_refunded   || 0);
    totalTransactions = parseInt(row.total_transactions || 0);
  } catch (_) { /* ignore */ }

  // -- Paid debts --
  let debtPaidTotal = 0, debtUnpaidTotal = 0, debtCount = 0;
  try {
    const row = await env.DB.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN status='Paid'   THEN amount ELSE 0 END),0) as paid_total,
        COALESCE(SUM(CASE WHEN status='Unpaid' THEN amount ELSE 0 END),0) as unpaid_total,
        COUNT(*) as cnt
       FROM debts WHERE tenant_id=?`
    ).bind(tid).first();
    debtPaidTotal   = parseFloat(row.paid_total   || 0);
    debtUnpaidTotal = parseFloat(row.unpaid_total || 0);
    debtCount       = parseInt(row.cnt            || 0);
  } catch (_) { /* debts table may not exist */ }

  // -- Cash transactions (walk-in sales) --
  let cashTotal = 0, cashCount = 0;
  try {
    const row = await env.DB.prepare(
      `SELECT COALESCE(SUM(total),0) as cash_total, COUNT(*) as cnt
       FROM cash_transactions WHERE tenant_id=?`
    ).bind(tid).first();
    cashTotal = parseFloat(row.cash_total || 0);
    cashCount = parseInt(row.cnt || 0);
  } catch (_) { /* cash_transactions table may not exist */ }

  // -- Payment method breakdown --
  let byMethod = [];
  try {
    const { results: pmRows } = await env.DB.prepare(
      `SELECT method, COALESCE(SUM(amount),0) as total_amount, COUNT(*) as count
       FROM payments WHERE status='Completed' AND tenant_id=? GROUP BY method ORDER BY total_amount DESC`
    ).bind(tid).all();
    byMethod = pmRows || [];
  } catch (_) { /* ignore */ }

  // Include paid debts as their own method entry
  if (debtPaidTotal > 0) {
    byMethod.push({ method: 'Debt Payment', total_amount: debtPaidTotal, count: debtCount });
  }

  // Include cash transactions grouped by method
  try {
    const { results: cashMethods } = await env.DB.prepare(
      `SELECT method, COALESCE(SUM(total),0) as total_amount, COUNT(*) as count
       FROM cash_transactions WHERE tenant_id=? GROUP BY method ORDER BY total_amount DESC`
    ).bind(tid).all();
    if (cashMethods && cashMethods.length > 0) {
      for (const cm of cashMethods) {
        // Merge with existing method entry if same name
        const existing = byMethod.find(m => m.method === cm.method);
        if (existing) {
          existing.total_amount = parseFloat(existing.total_amount) + parseFloat(cm.total_amount);
          existing.count = parseInt(existing.count) + parseInt(cm.count);
        } else {
          byMethod.push(cm);
        }
      }
    }
  } catch (_) { /* ignore */ }

  return Response.json({
    total_received:    totalReceived + debtPaidTotal + cashTotal,
    total_pending:     totalPending  + debtUnpaidTotal,
    total_refunded:    totalRefunded,
    total_transactions: totalTransactions + debtCount + cashCount,
    by_method: byMethod,
  });
}
