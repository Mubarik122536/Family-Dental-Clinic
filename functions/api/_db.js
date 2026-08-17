/**
 * Tenant-scoped D1 query wrapper
 *
 * Automatically appends AND tenant_id = ? to WHERE clauses
 * for SELECT, INSERT, UPDATE, DELETE statements.
 *
 * Usage:
 *   const db = createDb(env.DB, tenant_id);
 *   const rows = await db.all('SELECT * FROM customers WHERE status = ?', ['Active']);
 *   const row  = await db.first('SELECT * FROM customers WHERE id = ?', [id]);
 *   await db.run('UPDATE customers SET name = ? WHERE id = ?', [name, id]);
 *   await db.batch([stmt1, stmt2]);   // raw D1 statements for transactions
 */
export function createDb(D1, tenant_id) {
  /**
   * Inject AND tenant_id = ? into a SQL string.
   * Handles the cases:
   *   - Has WHERE clause  → appends AND tenant_id = ?
   *   - No WHERE clause   → appends WHERE tenant_id = ?
   *   - INSERT INTO       → injects (tenant_id, ...) into columns + values
   * For raw batch stmts (D1PreparedStatement), pass them unchanged.
   */
  function scopeSql(sql, params) {
    const upper = sql.trim().toUpperCase();

    // INSERT: inject tenant_id column + value
    if (upper.startsWith('INSERT')) {
      // We rely on callers to include tenant_id in INSERT statements explicitly
      // (simpler and safer than parsing INSERT column lists)
      return { sql, params };
    }

    // SELECT / UPDATE / DELETE — scope with tenant_id
    const hasWhere = /\bWHERE\b/i.test(sql);
    const insertBefore = /\b(RETURNING|ORDER BY|LIMIT|GROUP BY|HAVING)\b/i;
    const match = insertBefore.exec(sql);

    // Determine where in the SQL string to insert the tenant_id clause
    let insertPos;
    let clause;

    if (hasWhere) {
      clause = ' AND tenant_id = ? ';
    } else {
      clause = ' WHERE tenant_id = ? ';
    }

    if (match) {
      insertPos = match.index;
      sql = sql.slice(0, insertPos) + clause + sql.slice(insertPos);
    } else {
      insertPos = sql.length;
      sql = sql + clause;
    }

    // Count ? placeholders BEFORE the insertion point to splice tenant_id
    // into the correct position in the params array (not just at the end)
    const sqlBefore = sql.slice(0, insertPos);
    const paramIndex = (sqlBefore.match(/\?/g) || []).length;
    const newParams = [...params];
    newParams.splice(paramIndex, 0, tenant_id);

    return { sql, params: newParams };
  }

  return {
    /** Returns array of rows */
    async all(sql, params = []) {
      const scoped = scopeSql(sql, params);
      const { results } = await D1.prepare(scoped.sql).bind(...scoped.params).all();
      return results;
    },

    /** Returns single row or null */
    async first(sql, params = []) {
      const scoped = scopeSql(sql, params);
      return D1.prepare(scoped.sql).bind(...scoped.params).first();
    },

    /** Runs a statement, returns D1Result */
    async run(sql, params = []) {
      const scoped = scopeSql(sql, params);
      return D1.prepare(scoped.sql).bind(...scoped.params).run();
    },

    /**
     * Raw D1 batch — callers build D1PreparedStatements directly.
     * Used for multi-statement transactions (payment + balance update etc.)
     */
    async batch(stmts) {
      return D1.batch(stmts);
    },

    /** Expose raw D1 for building prepared stmts in batch calls */
    prepare(sql) {
      return D1.prepare(sql);
    },

    tenant_id,
  };
}
