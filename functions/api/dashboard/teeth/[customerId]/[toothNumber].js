export async function onRequest({ request, env, data, params }) {
  if (request.method !== 'DELETE') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  await env.DB.prepare(
    `DELETE FROM tooth_records WHERE customer_id=? AND tooth_id=? AND tenant_id=?`
  ).bind(params.customerId, decodeURIComponent(params.toothNumber), data.user.tenant_id).run();
  return Response.json({ message: 'Tooth record deleted' });
}
