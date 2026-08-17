export async function onRequest({ env, data }) {
  const today = new Date().toISOString().split('T')[0];
  try {
    const { results } = await env.DB.prepare(`
      SELECT a.id, a.customer_id, a.visit_date, a.next_visit, a.reminder,
             c.name as customer_name, c.phone as customer_phone
      FROM appointments a LEFT JOIN customers c ON a.customer_id = c.id
      WHERE a.next_visit >= ? AND a.tenant_id = ?
      ORDER BY a.next_visit ASC LIMIT 10
    `).bind(today, data.user.tenant_id).all();
    return Response.json(results || []);
  } catch (e) {
    return Response.json([], { status: 200 });
  }
}
