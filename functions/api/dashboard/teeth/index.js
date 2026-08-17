// Map quadrant tooth IDs (e.g. "UR1"..."LL8") to integers 1-32
// UR = upper right (teeth 1-8), UL = upper left (9-16), LR = lower right (17-24), LL = lower left (25-32)
function toothIdToNumber(toothId) {
  if (!toothId) return 1;
  const s = String(toothId).toUpperCase();
  const match = s.match(/^(UR|UL|LR|LL)(\d)$/);
  if (!match) {
    const n = parseInt(s);
    return isNaN(n) ? 1 : n;
  }
  const quadrant = match[1];
  const num = parseInt(match[2]);
  const offsets = { UR: 0, UL: 8, LR: 16, LL: 24 };
  return (offsets[quadrant] || 0) + num;
}

export async function onRequest({ request, env, data }) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const { customer_id, tooth_id, tooth_number, treatment_type, notes, status } = await request.json();
  const txStatus = status || 'Completed';

  // Resolve tooth number: accept either tooth_id (e.g. "UR3") or tooth_number (int)
  const resolvedNumber = tooth_number || toothIdToNumber(tooth_id);

  try {
    // Upsert using tenant_id + customer_id + tooth_number (actual old schema)
    const existing = await env.DB.prepare(
      `SELECT id FROM tooth_records WHERE customer_id = ? AND tooth_number = ? AND tenant_id = ?`
    ).bind(customer_id, resolvedNumber, data.user.tenant_id).first();

    let row;
    if (existing) {
      row = await env.DB.prepare(
        `UPDATE tooth_records SET treatment_type=?, status=?, notes=? WHERE id=? RETURNING *`
      ).bind(treatment_type, txStatus, notes || null, existing.id).first();
    } else {
      row = await env.DB.prepare(
        `INSERT INTO tooth_records (tenant_id, customer_id, tooth_number, treatment_type, status, notes) VALUES (?,?,?,?,?,?) RETURNING *`
      ).bind(data.user.tenant_id, customer_id, resolvedNumber, treatment_type, txStatus, notes || null).first();
    }
    return Response.json(row || { ok: true }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
