import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps a route element with auth + role checks.
 *
 * Props:
 *   children   — the page component to render
 *   role       — 'admin' | 'staff' | undefined (any authenticated user)
 *
 * Behaviour:
 *   loading    → show spinner
 *   no user    → redirect to /login (Cloudflare Access login page)
 *   wrong role → redirect to / (dashboard)
 *   ok         → render children
 */
export default function ProtectedRoute({ children, role }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Verifying identity…</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role && user.role !== role) {
        return <Navigate to="/" replace />;
    }

    return children;
}
