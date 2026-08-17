export async function onRequest({ request, env, data }) {
    const { user } = data;

    if (request.method === 'GET') {
        const url = new URL(request.url);
        const minDays = parseInt(url.searchParams.get('days')) || 90;

        try {
            const { results } = await env.DB.prepare(
                `SELECT
           d.id,
           d.name as customer_name,
           d.phone as customer_phone,
           d.amount as total_amount,
           d.service_name,
           d.status,
           d.created_at,
           CAST(julianday('now') - julianday(d.created_at) AS INTEGER) AS days_passed
         FROM debts d
         WHERE d.tenant_id = ?
           AND d.status != 'Paid'
           AND CAST(julianday('now') - julianday(d.created_at) AS INTEGER) >= ?
         ORDER BY CAST(julianday('now') - julianday(d.created_at) AS INTEGER) DESC`
            ).bind(user.tenant_id, minDays).all();

            return Response.json(results || []);
        } catch (e) {
            return Response.json({ error: e.message }, { status: 500 });
        }
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
