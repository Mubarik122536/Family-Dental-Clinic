import { verifyPassword, hashPassword } from '../_auth.js';

export async function onRequestPut({ request, env, data }) {
  const { user } = data;
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json();
    
    if (!currentPassword || !newPassword) {
      return Response.json({ error: 'Current and new passwords are required' }, { status: 400 });
    }

    // Password Strength Check
    if (newPassword.length < 8) {
      return Response.json({ error: 'New password must be at least 8 characters long' }, { status: 400 });
    }
    if (!/\d/.test(newPassword)) {
      return Response.json({ error: 'New password must contain at least one number' }, { status: 400 });
    }

    // 1. Get current hash
    const stored = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(user.id)
      .first();

    // 2. Verify current password
    const isValid = await verifyPassword(currentPassword, stored.password_hash);
    if (!isValid) {
      return Response.json({ error: 'Incorrect current password' }, { status: 403 });
    }

    // 3. Hash and save new password
    const newHash = await hashPassword(newPassword);
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(newHash, user.id)
      .run();

    return Response.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
