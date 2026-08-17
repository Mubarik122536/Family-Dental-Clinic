import { verifyPassword, signJwt, setTokenCookie } from '../_auth.js';

// POST /api/auth/login
export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const secret = env.AUTH_SECRET;
  if (!secret) return Response.json({ error: 'Server misconfiguration: AUTH_SECRET missing' }, { status: 500 });

  let email, password;
  try {
    ({ email, password } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 });
  }

  // Look up user
  const user = await env.DB
    .prepare('SELECT * FROM users WHERE email = ? AND is_active = 1')
    .bind(email.toLowerCase().trim())
    .first();

  // Use generic error to prevent user enumeration
  const INVALID = 'Invalid email or password';
  if (!user) return Response.json({ error: INVALID }, { status: 401 });

  // Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return Response.json({ error: INVALID }, { status: 401 });

  // Sign JWT
  const token = await signJwt({ sub: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id }, secret);

  // Return user info + token + set HttpOnly cookie
  return new Response(JSON.stringify({
    id: user.id, email: user.email, name: user.name, role: user.role, tenant_id: user.tenant_id, token
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setTokenCookie(token),
    },
  });
}
