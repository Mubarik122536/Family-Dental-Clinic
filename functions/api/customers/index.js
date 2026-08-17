export async function onRequest({ request, env, data }) {
  const { DB } = env;
  const tenant_id = data.user.tenant_id;
  const url = new URL(request.url);

  if (request.method === 'GET') {
    try {
      const search = (url.searchParams.get('search') || '').trim();
      const status = url.searchParams.get('status') || '';
      const letter = url.searchParams.get('letter') || '';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;
      const balanceFilter = url.searchParams.get('balance') || '';
      const skipStats = url.searchParams.get('skipStats') === 'true';

      // Build base filters
      const filters = ['c.tenant_id = ?'];
      const params = [tenant_id];

      if (status && status !== 'All') {
        filters.push('c.status = ?');
        params.push(status);
      }
      if (letter) {
        filters.push('c.name LIKE ?');
        params.push(`${letter}%`);
      }
      if (balanceFilter === 'with_balance') {
        filters.push('c.balance > 0');
      } else if (balanceFilter === 'paid') {
        filters.push('(c.balance IS NULL OR c.balance <= 0)');
      }

      let rows = [];
      let total = 0;

      if (search) {
        const isNumeric = /^\d+$/.test(search);

        if (isNumeric) {
          // Digits only: exact match on ID and exact/partial match on phone
          const searchFilters = [...filters, '(CAST(c.id AS TEXT) = ? OR c.phone = ? OR c.phone LIKE ?)'];
          const searchParams = [...params, search, search, `%${search}%`];

          const countRow = await DB.prepare(
            `SELECT COUNT(*) as cnt FROM customers c WHERE ${searchFilters.join(' AND ')}`
          ).bind(...searchParams).first();
          total = countRow?.cnt ?? 0;

          const result = await DB.prepare(
            `SELECT c.*, COALESCE(c.balance, 0) as balance,
                    CASE
                      WHEN CAST(c.id AS TEXT) = ? THEN 'id'
                      ELSE 'phone'
                    END as match_type
             FROM customers c
             WHERE ${searchFilters.join(' AND ')}
             ORDER BY (CASE WHEN CAST(c.id AS TEXT) = ? THEN 0 ELSE 1 END), c.name ASC
             LIMIT ? OFFSET ?`
          ).bind(search, ...searchParams, search, limit, offset).all();

          rows = result.results || [];
        } else {
          // Text search: match on name
          const searchFilters = [...filters, 'c.name LIKE ?'];
          const searchParams = [...params, `%${search}%`];

          const countRow = await DB.prepare(
            `SELECT COUNT(*) as cnt FROM customers c WHERE ${searchFilters.join(' AND ')}`
          ).bind(...searchParams).first();
          total = countRow?.cnt ?? 0;

          const result = await DB.prepare(
            `SELECT c.*, COALESCE(c.balance, 0) as balance, 'name' as match_type
             FROM customers c
             WHERE ${searchFilters.join(' AND ')}
             ORDER BY c.name ASC
             LIMIT ? OFFSET ?`
          ).bind(...searchParams, limit, offset).all();

          rows = result.results || [];
        }
      } else {
        // No search — paginated list
        const countRow = await DB.prepare(
          `SELECT COUNT(*) as cnt FROM customers c WHERE ${filters.join(' AND ')}`
        ).bind(...params).first();
        total = countRow?.cnt ?? 0;

        const result = await DB.prepare(
          `SELECT c.*, COALESCE(c.balance, 0) as balance
           FROM customers c
           WHERE ${filters.join(' AND ')}
           ORDER BY c.name ASC
           LIMIT ? OFFSET ?`
        ).bind(...params, limit, offset).all();

        rows = result.results || [];
      }

      // Global clinic-wide stats (single indexed aggregate query, skipped for dropdowns)
      let globalTotalDebt = 0;
      let globalWithBalanceCount = 0;

      if (!skipStats) {
        const stats = await DB.prepare(
          `SELECT 
             COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as totalDebt,
             COUNT(CASE WHEN balance > 0 THEN 1 END) as withBalanceCount
           FROM customers
           WHERE tenant_id = ?`
        ).bind(tenant_id).first();

        globalTotalDebt = stats?.totalDebt ?? 0;
        globalWithBalanceCount = stats?.withBalanceCount ?? 0;
      }

      return Response.json({
        rows,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        page,
        globalTotalDebt,
        globalWithBalanceCount
      });
    } catch (err) {
      console.error("GET CUSTOMERS ERROR:", err);
      return Response.json({ error: err.message || err.toString() }, { status: 500 });
    }
  }

  if (request.method === 'POST') {
    const { id, name, phone, notes } = await request.json();
    try {
      const row = await DB.prepare(
        `INSERT INTO customers (id, tenant_id, name, phone, notes, balance)
         VALUES (?,?,?,?,?,0) RETURNING *`
      ).bind(parseInt(id), tenant_id, name, phone, notes || null).first();
      return Response.json(row, { status: 201 });
    } catch (e) {
      if (e.message?.includes('UNIQUE')) return Response.json({ error: 'Phone number already exists' }, { status: 400 });
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
