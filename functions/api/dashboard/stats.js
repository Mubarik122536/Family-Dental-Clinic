export async function onRequest({ env, data }) {
  const tid = data.user.tenant_id;
  try {
    const [
      custResult,
      todayApptResult,
      totalApptResult,
      treatmentsResult,
      paymentsResult,
      debtsUnpaidResult,
      debtsPaidResult,
      cashResult
    ] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM customers WHERE tenant_id = ?`).bind(tid).first(),
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM appointments WHERE (visit_date = date('now') OR next_visit = date('now')) AND tenant_id = ?`).bind(tid).first().catch(() => ({ cnt: 0 })),
      env.DB.prepare(`SELECT COUNT(*) as cnt FROM appointments WHERE tenant_id = ?`).bind(tid).first().catch(() => ({ cnt: 0 })),
      env.DB.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM customer_treatments WHERE tenant_id = ?`).bind(tid).first().catch(() => ({ total: 0 })),
      env.DB.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'Completed' AND tenant_id = ?`).bind(tid).first().catch(() => ({ total: 0 })),
      env.DB.prepare(`SELECT COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) as total FROM debts WHERE status != 'Paid' AND tenant_id = ?`).bind(tid).first().catch(() => ({ total: 0 })),
      env.DB.prepare(`SELECT COALESCE(SUM(paid_amount), 0) as total FROM debts WHERE tenant_id = ?`).bind(tid).first().catch(() => ({ total: 0 })),
      env.DB.prepare(`SELECT COALESCE(SUM(total), 0) as total FROM cash_transactions WHERE tenant_id = ?`).bind(tid).first().catch(() => ({ total: 0 }))
    ]);

    const totalCustomers = custResult?.cnt ?? 0;
    const todayAppointments = todayApptResult?.cnt ?? 0;
    const totalAppointments = totalApptResult?.cnt ?? 0;
    const totalTreatments = parseFloat(treatmentsResult?.total ?? 0);
    const totalPaid = parseFloat(paymentsResult?.total ?? 0);
    const totalDebtsUnpaid = parseFloat(debtsUnpaidResult?.total ?? 0);
    const totalDebtsPaid = parseFloat(debtsPaidResult?.total ?? 0);
    const totalCashSales = parseFloat(cashResult?.total ?? 0);

    const balanceDue = totalTreatments - totalPaid;
    const totalRevenue = totalPaid + totalDebtsPaid + totalCashSales;

    return Response.json({
      totalCustomers,
      todayAppointments,
      totalAppointments,
      totalTreatments,
      totalPaid: totalRevenue,
      totalDebt: (balanceDue > 0 ? balanceDue : 0) + totalDebtsUnpaid,
    });
  } catch (err) {
    return Response.json({
      totalCustomers: 0,
      todayAppointments: 0,
      totalAppointments: 0,
      totalTreatments: 0,
      totalPaid: 0,
      totalDebt: 0,
      error: err.message
    }, { status: 500 });
  }
}
