import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from './BrandLogo';

const allNavItems = [
    { path: '/', icon: 'dashboard', label: 'Dashboard' },
    { path: '/customers', icon: 'groups', label: 'Braces' },
    { path: '/appointments', icon: 'calendar_month', label: 'Appointments' },
    { path: '/treatments', icon: 'dentistry', label: 'Treatments' },
    { path: '/debts', icon: 'account_balance', label: 'Debts' },
    { path: '/collections', icon: 'gavel', label: 'Collections' },
    { path: '/payments', icon: 'payments', label: 'Payments' },
    { path: '/cash', icon: 'point_of_sale', label: 'Cash' },
    { path: '/expenses', icon: 'receipt_long', label: 'Expenses', adminOnly: true },
    { path: '/reports', icon: 'bar_chart', label: 'Reports', adminOnly: true },
    { path: '/users', icon: 'manage_accounts', label: 'Users', adminOnly: true },
];

export default function Sidebar() {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const isAdmin = user?.role === 'admin';

    // Filter nav items based on role
    const navItems = allNavItems.filter(item => {
        if (item.adminOnly && !isAdmin) return false;
        return true;
    });

    return (
        <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 flex flex-col">
            {/* Logo */}
            <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                <img src="/logo.png" alt="Family Dental Clinic" className="w-10 h-10 object-contain rounded-lg" />
                <div className="flex-1">
                    <h1 className="font-bold text-lg leading-tight text-primary dark:text-primary-300">Family Dental</h1>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Clinic Management</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300 font-semibold border-r-4 border-primary dark:border-primary-400'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                                {item.icon}
                            </span>
                            <span className="text-sm font-medium">{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Bottom Settings & Logout */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-1 shrink-0 mt-auto">
                {isAdmin && (
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-300 font-semibold'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-200'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        <span className="text-sm font-medium">Settings</span>
                    </NavLink>
                )}
                <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
                >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>

            {/* Powered by Branding */}
            <div className="px-6 py-4 border-t border-slate-50 dark:border-slate-800/50 shrink-0 flex justify-center">
                <BrandLogo />
            </div>
        </aside>
    );
}
