// POST /api/customers/bulk-upload  (CSV multipart)
export async function onRequest({ request, env, data }) {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

    const { DB } = env;
    const tenant_id = data.user.tenant_id;
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 });

    const text = await file.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return Response.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const idIdx = headers.indexOf('id');
    const nameIdx = headers.indexOf('name');
    const phoneIdx = headers.indexOf('phone');
    const notesIdx = headers.indexOf('notes');

    if (nameIdx === -1 || phoneIdx === -1) return Response.json({ error: 'CSV must have name and phone columns' }, { status: 400 });

    let added = 0, skipped = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const name = cols[nameIdx];
        const phone = cols[phoneIdx];
        if (!name || !phone) {
            errors.push(`Row ${i}: Missing name or phone`);
            skipped++;
            continue;
        }
        const customId = idIdx !== -1 ? cols[idIdx] : null;
        try {
            if (customId) {
                await DB.prepare(
                    `INSERT INTO customers (id, name, phone, notes, tenant_id) VALUES (?,?,?,?,?)`
                ).bind(customId, name, phone, cols[notesIdx] || null, tenant_id).run();
            } else {
                await DB.prepare(
                    `INSERT INTO customers (name, phone, notes, tenant_id) VALUES (?,?,?,?)`
                ).bind(name, phone, cols[notesIdx] || null, tenant_id).run();
            }
            added++;
        } catch (e) {
            errors.push(`Row ${i}: ${e.message?.includes('UNIQUE') ? `Duplicate phone ${phone}` : e.message}`);
            skipped++;
        }
    }

    return Response.json({ added, skipped, total: lines.length - 1, errors });
}
