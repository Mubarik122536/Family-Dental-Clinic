import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const mainTabs = [
    { path: '/', icon: 'dashboard', label: 'Home' },
    { path: '/customers', icon: 'groups', label: 'Braces' },
    { path: '/appointments', icon: 'calendar_month', label: 'Appts' },
    { path: '/cash', icon: 'point_of_sale', label: 'Cash' },
];

const moreItems = [
    { path: '/treatments', icon: 'dentistry', label: 'Treatments' },
    { path: '/debts', icon: 'account_balance', label: 'Debts' },
    { path: '/collections', icon: 'gavel', label: 'Collections' },
    { path: '/payments', icon: 'payments', label: 'Payments' },
    { path: '/expenses', icon: 'receipt_long', label: 'Expenses', adminOnly: true },
    { path: '/reports', icon: 'bar_chart', label: 'Reports', adminOnly: true },
    { path: '/users', icon: 'manage_accounts', label: 'Users', adminOnly: true },
    { path: '/settings', icon: 'settings', label: 'Settings', adminOnly: true },
];

export default function MobileNav() {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [showMore, setShowMore] = useState(false);

    const filteredMoreItems = moreItems.filter(item => {
        if (item.adminOnly && !isAdmin) return false;
        return true;
    });

    const isMoreActive = filteredMoreItems.some(item => location.pathname.startsWith(item.path));

    return (
        <>
            {/* Bottom Tab Bar */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 px-2 pb-safe pt-1 flex justify-around items-center h-16 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-none">
                {mainTabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <NavLink
                            key={tab.path}
                            to={tab.path}
                            onClick={() => setShowMore(false)}
                            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                                isActive ? 'text-primary dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-[24px] ${isActive ? 'filled font-semibold' : 'font-light'}`}>
                                {tab.icon}
                            </span>
                            <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                        </NavLink>
                    );
                })}

                {/* More Button */}
                <button
                    onClick={() => setShowMore(!showMore)}
                    className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                        showMore || isMoreActive ? 'text-primary dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'
                    }`}
                >
                    <span className={`material-symbols-outlined text-[24px] ${(showMore || isMoreActive) ? 'filled font-semibold' : 'font-light'}`}>
                        menu
                    </span>
                    <span className={`text-[10px] ${(showMore || isMoreActive) ? 'font-bold' : 'font-medium'}`}>Menu</span>
                </button>
            </nav>

            {/* More Menu Full-Screen Overlay */}
            {showMore && (
                <div className="md:hidden fixed inset-0 z-40 bg-white dark:bg-slate-900 overflow-y-auto pb-24 pt-4 px-4 flex flex-col animate-slide-up">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">All Modules</h2>
                        <button onClick={() => setShowMore(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {filteredMoreItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setShowMore(false)}
                                    className={`flex flex-col items-start justify-center p-4 rounded-2xl border transition-all ${
                                        isActive 
                                        ? 'bg-primary/10 border-primary/30 text-primary dark:text-primary-300 dark:bg-primary/20 dark:border-primary/50' 
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-3xl mb-2 text-primary opacity-80">{item.icon}</span>
                                    <span className="text-sm font-bold">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>

                    <div className="mt-auto pt-8">
                        <button
                            onClick={() => { setShowMore(false); signOut(); }}
                            className="w-full flex items-center justify-center gap-2 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold rounded-2xl transition-colors active:bg-rose-100"
                        >
                            <span className="material-symbols-outlined font-semibold">logout</span>
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
