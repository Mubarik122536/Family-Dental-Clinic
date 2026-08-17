import { createDb } from '../_db.js';

export async function onRequest({ env, data }) {
  const db = createDb(env.DB, data.user.tenant_id);
  const rows = await db.all(`SELECT DISTINCT category FROM treatments ORDER BY category`);
  return Response.json(rows.map(r => r.category));
}
