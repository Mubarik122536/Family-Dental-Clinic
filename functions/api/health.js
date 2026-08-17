export async function onRequest({ env }) {
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
}
