import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAppointmentNotifications, getDebtNotifications } from '../services/api';

export default function Header({ title, children, showSearch = false }) {
    const { user, signOut } = useAuth();
    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';
    const { theme, toggleTheme } = useTheme();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showWhatsApp, setShowWhatsApp] = useState(null);
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // Fetch live notifications (appointments + debt reminders) with visibility-aware polling
    useEffect(() => {
        let lastFetchTime = 0;

        const fetchNotifs = async () => {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
                return;
            }
            try {
                const [appts, debts] = await Promise.all([
                    getAppointmentNotifications().catch(() => []),
                    getDebtNotifications().catch(() => []),
                ]);
                const apptNotifs = (Array.isArray(appts) ? appts : []).map(n => ({ ...n, type: 'appointment' }));
                const debtNotifs = (Array.isArray(debts) ? debts : []);
                setNotifications([...apptNotifs, ...debtNotifs]);
                lastFetchTime = Date.now();
            } catch (_) { /* silent */ }
        };

        fetchNotifs();
        const interval = setInterval(fetchNotifs, 120000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && Date.now() - lastFetchTime > 60000) {
                fetchNotifs();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unreadCount = notifications.length;

    return (
        <>
            <header className="h-14 md:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-3 md:px-8 flex items-center justify-between sticky top-0 z-40 transition-colors">
                <div className="flex items-center gap-1 md:gap-4 flex-1 min-w-0">
                    <h2 className="text-base md:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">{title}</h2>
                    {showSearch && (
                        <div className="relative ml-2 md:ml-6 hidden md:block">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary/30 focus:bg-white dark:focus:bg-slate-700 w-48 lg:w-72 text-sm transition-all placeholder:text-slate-400 dark:text-slate-200"
                                placeholder="Search customers, appointments..."
                                type="text"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 md:gap-4">
                    {children}

                    {/* Theme Toggle — desktop only */}
                    <button
                        onClick={toggleTheme}
                        className="hidden md:flex p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors items-center justify-center"
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        <span className="material-symbols-outlined text-[22px]">
                            {theme === 'light' ? 'dark_mode' : 'light_mode'}
                        </span>
                    </button>

                    {/* Notifications Bell */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => { setShowNotifications(v => !v); setShowProfile(false); }}
                            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative transition-colors"
                        >
                            <span className="material-symbols-outlined text-[22px]">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-slate-900">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Ogeysiisyada</h4>
                                    <span className="text-xs font-bold text-rose-500">{unreadCount} cusub</span>
                                </div>
                                {notifications.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600">notifications_none</span>
                                        <p className="text-sm text-slate-400 mt-2">Wax ogeysiis ah majiraan</p>
                                        <p className="text-[11px] text-slate-300 dark:text-slate-500 mt-1">Ballamaha iyo deynta halkan ka muuqan doonaan</p>
                                    </div>
                                ) : (
                                    <div className="max-h-80 overflow-y-auto">
                                        {/* Appointment Notifications */}
                                        {notifications.filter(n => n.type === 'appointment').length > 0 && (
                                            <>
                                                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
                                                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                        Ballamaha — {notifications.filter(n => n.type === 'appointment').length}
                                                    </p>
                                                </div>
                                                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                    {notifications.filter(n => n.type === 'appointment').map((n, idx) => (
                                                        <button key={`appt-${n.id}-${idx}`}
                                                            onClick={() => { setShowWhatsApp(n); setShowNotifications(false); }}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                                            <div className="flex items-start gap-3">
                                                                <span className={`material-symbols-outlined text-[18px] mt-0.5 ${n.days_overdue > 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                                                                    {n.days_overdue > 0 ? 'warning' : 'schedule'}
                                                                </span>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{n.customer_name || `Customer #${n.customer_id}`}</p>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5">{n.customer_phone || 'No phone'} · {n.days_overdue === 0 ? 'Maanta' : `${n.days_overdue} maalmood ka hor`}</p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        {/* Debt Notifications */}
                                        {notifications.filter(n => n.type === 'debt').length > 0 && (
                                            <>
                                                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30 border-t border-t-slate-100 dark:border-t-slate-700">
                                                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px]">payments</span>
                                                        Deynta — {notifications.filter(n => n.type === 'debt').length}
                                                    </p>
                                                </div>
                                                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                                    {notifications.filter(n => n.type === 'debt').map((n, idx) => (
                                                        <button key={`debt-${n.id}-${idx}`}
                                                            onClick={() => { setShowWhatsApp(n); setShowNotifications(false); }}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                                                            <div className="flex items-start gap-3">
                                                                <span className={`material-symbols-outlined text-[18px] mt-0.5 ${n.days_overdue > 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                                                                    {n.days_overdue > 0 ? 'warning' : 'payments'}
                                                                </span>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{n.name} — ${n.remaining?.toFixed(2)}</p>
                                                                    <p className="text-[11px] text-slate-400 mt-0.5">{n.phone || 'No phone'} · {n.days_overdue === 0 ? 'Maanta bixinta' : `${n.days_overdue} maalmood ka dambeeya`}</p>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Divider + User Profile — desktop only */}
                    <div className="hidden md:flex items-center gap-1">
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => { setShowProfile(v => !v); setShowNotifications(false); }}
                                className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 py-1 transition-colors"
                            >
                                <div className="text-right">
                                    <p className="text-sm font-semibold leading-none text-slate-800 dark:text-slate-200">{user?.name}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{user?.role}</p>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                                    {initials}
                                </div>
                            </button>

                            {showProfile && (
                                <div className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700">
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user?.name}</p>
                                        <p className="text-[11px] text-slate-400">{user?.email}</p>
                                    </div>
                                    <div className="p-1">
                                        <button onClick={() => { window.location.href = '/settings'; setShowProfile(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm text-slate-600 dark:text-slate-300 transition-colors">
                                            <span className="material-symbols-outlined text-[18px] text-slate-400">settings</span>
                                            Settings
                                        </button>
                                        <button
                                            onClick={signOut}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm text-rose-500 dark:text-rose-400 transition-colors mt-0.5"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">logout</span>
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* WhatsApp Reminder Modal */}
            {showWhatsApp && (() => {
                const isDebt = showWhatsApp.type === 'debt';
                const displayName = isDebt ? showWhatsApp.name : (showWhatsApp.customer_name || '—');
                const displayPhone = isDebt ? (showWhatsApp.phone || '') : (showWhatsApp.customer_phone || '');
                const displayId = isDebt ? showWhatsApp.id : showWhatsApp.customer_id;
                const waPhone = displayPhone.replace(/[^0-9]/g, '');
                const waMessage = isDebt
                    ? `Assalamu Calaykum ${displayName}, tani waa xasuusin ka timid Family Dental Clinic. Waxaan kugu leenahay dayn dhan $${showWhatsApp.remaining?.toFixed(2)}. Fadlan nala soo xidhiidh si aad u bixiso. Mahadsanid.`
                    : `Assalamu Calaykum ${displayName}, tani waa xasuusin ka timid Family Dental Clinic. Waxaad ballan u leedahay daaweyn ilkaha maanta. Fadlan ha iloobin ballantaada. Mahadsanid.`;
                return (
                    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-emerald-500">chat</span>
                                    {isDebt ? 'Xasuusin Deyn' : 'Xasuusin Ballan'}
                                </h3>
                                <button onClick={() => setShowWhatsApp(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="space-y-3 mb-5">
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ID</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">#{displayId}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Magaca</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{displayName}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Telefoonka</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{displayPhone || 'Telefoon la\'aan'}</span>
                                </div>
                                {isDebt && (
                                    <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20">
                                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Deynta Haray</span>
                                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">${showWhatsApp.remaining?.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1">Fariinta</p>
                                    <p className="text-sm text-emerald-800 dark:text-emerald-300">{waMessage}</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setShowWhatsApp(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Xir</button>
                                <a
                                    href={`https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">chat</span>
                                    WhatsApp ku Dir
                                </a>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
