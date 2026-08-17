import { clearTokenCookie } from '../_auth.js';

// POST /api/auth/logout
export async function onRequest({ request }) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  return new Response(JSON.stringify({ message: 'Logged out' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearTokenCookie() },
  });
}
