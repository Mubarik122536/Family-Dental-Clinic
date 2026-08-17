export async function onRequest({ request, env, data }) {
    const { user } = data;

    // Only admins can manage users
    if (user.role !== 'admin') {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (request.method === 'GET') {
        try {
            const { results } = await env.DB.prepare(
                `SELECT id, email, name, role, is_active, created_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC`
            ).bind(user.tenant_id).all();
            return Response.json(results || []);
        } catch (e) {
            return Response.json({ error: e.message }, { status: 500 });
        }
    }

    if (request.method === 'POST') {
        const { email, name, role, password } = await request.json();
        if (!email || !name || !role) {
            return Response.json({ error: 'Email, name, and role are required' }, { status: 400 });
        }

        // Hash password using PBKDF2 (same as auth system)
        let passwordHash = '';
        if (password) {
            const encoder = new TextEncoder();
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const saltHex = [...salt].map(b => b.toString(16).padStart(2, '0')).join('');
            const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
            const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
            const hashHex = [...new Uint8Array(derivedBits)].map(b => b.toString(16).padStart(2, '0')).join('');
            passwordHash = `pbkdf2:${saltHex}:${hashHex}`;
        }

        try {
            const row = await env.DB.prepare(
                `INSERT INTO users (email, name, role, tenant_id, password_hash, is_active) VALUES (?,?,?,?,?,1) RETURNING id, email, name, role, is_active, created_at`
            ).bind(email, name, role, user.tenant_id, passwordHash).first();
            return Response.json(row, { status: 201 });
        } catch (e) {
            if (e.message.includes('UNIQUE')) {
                return Response.json({ error: 'A user with this email already exists' }, { status: 409 });
            }
            return Response.json({ error: e.message }, { status: 500 });
        }
    }

    if (request.method === 'PUT') {
        const { id, name, role, is_active, password } = await request.json();
        if (!id) return Response.json({ error: 'User ID required' }, { status: 400 });

        // Prevent admin from deactivating themselves
        if (parseInt(id) === user.id && is_active === 0) {
            return Response.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
        }

        try {
            let query, binds;
            if (password) {
                // Re-hash password
                const encoder = new TextEncoder();
                const salt = crypto.getRandomValues(new Uint8Array(16));
                const saltHex = [...salt].map(b => b.toString(16).padStart(2, '0')).join('');
                const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
                const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
                const hashHex = [...new Uint8Array(derivedBits)].map(b => b.toString(16).padStart(2, '0')).join('');
                const passwordHash = `pbkdf2:${saltHex}:${hashHex}`;
                query = `UPDATE users SET name=?, role=?, is_active=?, password_hash=? WHERE id=? AND tenant_id=? RETURNING id, email, name, role, is_active, created_at`;
                binds = [name, role, is_active ?? 1, passwordHash, id, user.tenant_id];
            } else {
                query = `UPDATE users SET name=?, role=?, is_active=? WHERE id=? AND tenant_id=? RETURNING id, email, name, role, is_active, created_at`;
                binds = [name, role, is_active ?? 1, id, user.tenant_id];
            }
            const row = await env.DB.prepare(query).bind(...binds).first();
            if (!row) return Response.json({ error: 'User not found' }, { status: 404 });
            return Response.json(row);
        } catch (e) {
            return Response.json({ error: e.message }, { status: 500 });
        }
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
