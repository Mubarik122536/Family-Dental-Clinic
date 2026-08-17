export async function onRequestPut({ request, env, data }) {
  const { user } = data;
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { name } = await request.json();
    if (!name) return Response.json({ error: 'Name is required' }, { status: 400 });

    await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?')
      .bind(name, user.id)
      .run();

    return Response.json({ success: true, name });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
