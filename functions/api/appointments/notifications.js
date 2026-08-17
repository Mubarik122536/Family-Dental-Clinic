export async function onRequest({ request, env, data }) {
    const { user } = data;

    if (request.method === 'GET') {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { results } = await env.DB.prepare(
                `SELECT a.id, a.customer_id, a.visit_date, a.next_visit, a.reminder, a.created_at,
                c.name as customer_name, c.phone as customer_phone
         FROM appointments a
         LEFT JOIN customers c ON a.customer_id = c.id
         WHERE a.tenant_id = ? AND a.reminder = 1 AND a.next_visit <= ?
         ORDER BY a.next_visit ASC`
            ).bind(user.tenant_id, today).all();

            const rows = (results || []).map(r => {
                const diff = Math.floor((new Date(today) - new Date(r.next_visit)) / 86400000);
                let message = '';
                if (diff === 0) message = `Customer ${r.customer_id} — Visit Today`;
                else if (diff > 0) message = `Customer ${r.customer_id} — Missed Visit (${diff} day${diff > 1 ? 's' : ''} ago)`;
                return { ...r, message, days_overdue: diff };
            });

            return Response.json(rows);
        } catch (e) {
            return Response.json({ error: e.message }, { status: 500 });
        }
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
