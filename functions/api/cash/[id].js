export async function onRequest({ request, env, data, params }) {
  const { user } = data;

  if (request.method === 'DELETE') {
    const id = params.id;
    try {
      const result = await env.DB.prepare(
        `DELETE FROM cash_transactions WHERE id = ? AND tenant_id = ?`
      ).bind(id, user.tenant_id).run();
      if (result.meta?.changes === 0) {
        return Response.json({ error: 'Record not found' }, { status: 404 });
      }
      return Response.json({ success: true });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
