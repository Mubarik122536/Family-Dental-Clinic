import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On mount — check if already logged in (JWT cookie exists)
    useEffect(() => {
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => res.ok ? res.json() : null)
            .then(data => setUser(data))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    // Sign in — POST credentials, backend sets HttpOnly cookie
    const signIn = async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        if (data.token) localStorage.setItem('dental_token', data.token);
        setUser(data);
        return data;
    };

    // Sign out — clear cookie on server then clear state
    const signOut = async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        localStorage.removeItem('dental_token');
        setUser(null);
        window.location.href = '/login';
    };

    // Refresh user data (after profile updates)
    const refreshUser = async () => {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = res.ok ? await res.json() : null;
        setUser(data);
    };

    return (
        <AuthContext.Provider value={{ user, role: user?.role ?? null, loading, signIn, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
