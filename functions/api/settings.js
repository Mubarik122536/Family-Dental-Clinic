import { createDb } from './_db.js';

export async function onRequestGet({ env, data }) {
  const { user } = data;
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const db = createDb(env.DB, user.tenant_id);
    const settings = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?')
      .bind(user.tenant_id)
      .first();

    return Response.json(settings);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPut({ request, env, data }) {
  const { user } = data;
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const body = await request.json();
    const allowedFields = [
      'name', 'email', 'phone', 'address', 'currency', 'timezone', 'language',
      'appointment_duration', 'working_hours_start', 'working_hours_end',
      'email_notifications', 'sms_reminders', 'appointment_reminder', 'payment_alerts'
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field]);
      }
    }

    if (updates.length === 0) return Response.json({ error: 'No fields provided' }, { status: 400 });

    params.push(user.tenant_id);
    const sql = `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`;
    
    await env.DB.prepare(sql).bind(...params).run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
