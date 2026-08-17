// GET /api/auth/me — returns current user's identity from context
export async function onRequest({ data }) {
  const { user } = data;
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant_id: user.tenant_id,
  });
}
