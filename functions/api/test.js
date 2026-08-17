export async function onRequest({ env }) {
    try {
        const { DB } = env;
        const filterParams = [1];
        const limit = 50;
        const offset = 0;
        const whereClause = 'WHERE tenant_id = ?';

        const rows = await DB.prepare(
            `SELECT c.*
       FROM customers c ${whereClause.replace('tenant_id', 'c.tenant_id').replace('name LIKE', 'c.name LIKE').replace('phone LIKE', 'c.phone LIKE').replace('status =', 'c.status =')}
       ORDER BY c.name ASC LIMIT ? OFFSET ?`
        ).bind(...filterParams, limit, offset).all();

        const countRow = await DB.prepare(
            `SELECT COUNT(*) as cnt FROM customers ${whereClause}`
        ).bind(...filterParams).first();

        const stats = await DB.prepare(
            `SELECT 
        COALESCE(SUM(balance), 0) as totalDebt,
        COUNT(CASE WHEN balance > 0 THEN 1 END) as withBalanceCount
       FROM customers WHERE tenant_id = ?`
        ).bind(1).first();

        return Response.json({
            rows: rows.results,
            count: countRow.cnt,
            stats
        });
    } catch (err) {
        return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
    }
}
