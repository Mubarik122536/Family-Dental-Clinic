import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
    const navigate = useNavigate();
    const { user, loading: authLoading, signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            navigate('/', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signIn(email, password);
            navigate('/', { replace: true });
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 dark:bg-accent/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/[0.02] dark:bg-primary/[0.05] rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-700 p-8 transition-colors">

                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <img src="/logo.png" alt="Family Dental Clinic" className="w-20 h-20 object-contain" />
                        </div>
                        <h1 className="text-2xl font-bold text-primary tracking-tight">Family Dental</h1>
                        <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Clinic Management System</p>
                    </div>

                    {/* Welcome */}
                    <div className="text-center mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Welcome Back</h2>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Sign in to access your clinic dashboard</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm px-4 py-3 rounded-xl">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">mail</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] mt-2"
                        >
                            {loading ? (
                                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Signing in…</>
                            ) : (
                                <><span className="material-symbols-outlined text-xl">login</span> Sign In</>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
                        Forgot your password? Contact your administrator.
                    </p>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50 flex justify-center">
                        <BrandLogo />
                    </div>
                </div>
            </div>
        </div>
    );
}
