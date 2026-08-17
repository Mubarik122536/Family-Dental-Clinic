export async function onRequestDelete(context) {
    try {
        const { env, params, data } = context;
        const user = data?.user;

        if (!user?.tenant_id) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const paymentId = params.id;
        if (!paymentId) {
            return Response.json({ error: 'Payment ID is required' }, { status: 400 });
        }

        // ── Fetch and delete atomically ───────────────────────────────
        // SELECT then DELETE is two steps, but we check "changes" to detect
        // double-delete: second call sees 0 rows changed → 404
        const payment = await env.DB.prepare(
            `SELECT * FROM payments WHERE id = ? AND tenant_id = ?`
        ).bind(paymentId, user.tenant_id).first();

        if (!payment) {
            // Already deleted or never existed
            return Response.json({ error: 'Payment not found' }, { status: 404 });
        }

        const deleteResult = await env.DB.prepare(
            `DELETE FROM payments WHERE id = ? AND tenant_id = ?`
        ).bind(paymentId, user.tenant_id).run();

        // Guard: if another concurrent request deleted it first
        if (deleteResult.meta?.changes === 0) {
            return Response.json({ error: 'Payment already deleted' }, { status: 409 });
        }

        // ── Add the amount back to customer balance ────────────────────
        const amount = Math.round(parseFloat(payment.amount) * 100) / 100;
        await env.DB.prepare(
            `UPDATE customers SET balance = balance + ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?`
        ).bind(amount, payment.customer_id, user.tenant_id).run();

        return Response.json({ success: true, message: 'Payment deleted successfully', refunded: amount });

    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
