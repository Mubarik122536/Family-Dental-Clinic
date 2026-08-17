// Map tooth_number integer back to quadrant string for frontend display
function numberToToothId(n) {
  if (!n) return String(n);
  if (n <= 8)  return `UR${n}`;
  if (n <= 16) return `UL${n - 8}`;
  if (n <= 24) return `LR${n - 16}`;
  return `LL${n - 24}`;
}

export async function onRequest({ env, data, params }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM tooth_records WHERE customer_id=? AND tenant_id=? ORDER BY tooth_number`
    ).bind(params.customerId, data.user.tenant_id).all();

    // Add tooth_id field so the Odontogram frontend can use it
    const rows = (results || []).map(r => ({
      ...r,
      tooth_id: r.tooth_id || numberToToothId(r.tooth_number),
    }));
    return Response.json(rows);
  } catch (e) {
    return Response.json([]);
  }
}
