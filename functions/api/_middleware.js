import { verifyJwt, getTokenFromCookie } from './_auth.js';

export async function onRequest(ctx) {
  const { request, env, next, data } = ctx;

  // ── CORS preflight ────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // ── Skip auth for login / logout / health ─────────────
  const url = new URL(request.url);
  const path = url.pathname;
  const isPublic = path === '/api/auth/login' || path === '/api/auth/logout' || path === '/api/health';
  if (isPublic) {
    const response = await next();
    return addCors(response);
  }

  // ── Verify JWT from cookie OR Authorization header ─────
  const secret = env.AUTH_SECRET;
  if (!secret) return jsonError(500, 'AUTH_SECRET not configured');

  // Try Authorization: Bearer <token> first, then cookie
  const authHeader = request.headers.get('Authorization');
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7) : getTokenFromCookie(request);
  if (!token) return jsonError(401, 'Not authenticated. Please log in.');

  const payload = await verifyJwt(token, secret);
  if (!payload) return jsonError(401, 'Session expired. Please log in again.');

  // ── Check user still active in DB ────────────────────
  const user = await env.DB
    .prepare('SELECT id, email, name, role, tenant_id, is_active FROM users WHERE id = ?')
    .bind(payload.sub)
    .first();

  if (!user || !user.is_active) return jsonError(403, 'Account deactivated. Contact your administrator.');

  // ── Inject user into context ──────────────────────────
  data.user = { id: user.id, email: user.email, name: user.name, role: user.role, tenant_id: user.tenant_id };

  const response = await next();
  return addCors(response);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
function addCors(response) {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
}
function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
