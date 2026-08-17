export async function onRequest({ request, env, data, params }) {
  const { user } = data;
  const customerId = params.id;

  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get customer info
    const customer = await env.DB.prepare(
      `SELECT * FROM customers WHERE id = ? AND tenant_id = ?`
    ).bind(customerId, user.tenant_id).first();

    if (!customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get treatment history — table may not exist yet, safe fallback
    let treatments = [];
    try {
      const result = await env.DB.prepare(
        `SELECT ct.*, t.name as treatment_name, t.category as treatment_category
         FROM customer_treatments ct LEFT JOIN treatments t ON ct.treatment_id = t.id
         WHERE ct.customer_id = ? AND ct.tenant_id = ?
         ORDER BY ct.treatment_date DESC`
      ).bind(customerId, user.tenant_id).all();
      treatments = result.results || [];
    } catch (e) { treatments = []; }

    // Get payment history
    let payments = [];
    try {
      const result = await env.DB.prepare(
        `SELECT p.* FROM payments p
         WHERE p.customer_id = ? AND p.tenant_id = ?
         ORDER BY p.created_at DESC`
      ).bind(customerId, user.tenant_id).all();
      payments = result.results || [];
    } catch (e) { payments = []; }

    // Get tooth records
    let toothRecords = [];
    try {
      const result = await env.DB.prepare(
        `SELECT * FROM tooth_records
         WHERE customer_id = ? AND tenant_id = ?
         ORDER BY created_at DESC`
      ).bind(customerId, user.tenant_id).all();
      toothRecords = result.results || [];
    } catch (e) { toothRecords = []; }

    // Financial summary
    const totalTreatments = treatments.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
    const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const calculatedBalance = Math.max(0, totalTreatments - totalPayments);

    return Response.json({
      customer,
      treatments,
      payments,
      toothRecords,
      financials: {
        totalTreatments,
        totalPayments,
        balance: calculatedBalance,
      }
    });

  } catch (err) {
    console.error('Profile error:', err);
    return Response.json({ error: 'Failed to load profile', detail: err.message }, { status: 500 });
  }
}
