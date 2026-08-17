import { useState, useEffect } from 'react';
import Header from '../components/Header';
import StatCard from '../components/StatCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboardStats, getRevenueChart, getUpcomingAppointments } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [stats, setStats] = useState(null);
    const [revenueData, setRevenueData] = useState(null);
    const [appointments, setAppointments] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const promises = [];
                if (isAdmin) {
                    promises.push(
                        getDashboardStats().then(setStats).catch(() => setStats({ totalCustomers: 0, todayAppointments: 0, totalTreatments: 0, totalPaid: 0, totalDebt: 0 })),
                        getRevenueChart().then(d => setRevenueData(Array.isArray(d) ? d : [])).catch(() => setRevenueData([]))
                    );
                }
                promises.push(
                    getUpcomingAppointments().then(d => setAppointments(Array.isArray(d) ? d : [])).catch(() => setAppointments([]))
                );
                await Promise.all(promises);
            } catch (_) { }
            finally { setLoading(false); }
        };
        load();
    }, [isAdmin]);

    const s = stats || { totalCustomers: 0, todayAppointments: 0, totalTreatments: 0, totalPaid: 0, totalDebt: 0 };

    return (
        <>
            <Header title="Dashboard Overview" />
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                {/* Loading Spinner */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span>
                    </div>
                )}

                {!loading && isAdmin && (
                    <>
                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <StatCard icon="person" iconBg="bg-primary/10" iconColor="text-primary" label="Total Braces" value={s.totalCustomers.toString()} />
                            <StatCard icon="dentistry" iconBg="bg-blue-100" iconColor="text-blue-600" label="Total Treatments" value={`$${(s.totalTreatments || 0).toLocaleString()}`} />
                            <StatCard icon="account_balance_wallet" iconBg="bg-emerald-100" iconColor="text-emerald-600" label="Total Paid" value={`$${(s.totalPaid || 0).toLocaleString()}`} />
                            <StatCard icon="credit_card_off" iconBg="bg-rose-100" iconColor="text-rose-600" label="Balance Due" value={`$${(s.totalDebt || 0).toLocaleString()}`} />
                        </div>

                        {/* Revenue Chart + Summary */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Revenue Growth</h4>
                                        <p className="text-xs text-slate-400">Monthly financial performance overview</p>
                                    </div>
                                    <select className="bg-slate-100 dark:bg-slate-700/50 border-none rounded-lg text-xs px-3 py-1.5 focus:ring-2 focus:ring-primary/20 text-slate-600 dark:text-slate-200 font-medium">
                                        <option>Last 6 Months</option>
                                        <option>Last Year</option>
                                    </select>
                                </div>
                                <div className="h-48">
                                    {revenueData && revenueData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={revenueData}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#1a2b5f" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#1a2b5f" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(value) => [`$${parseFloat(value).toLocaleString()}`, 'Revenue']} />
                                                <Area type="monotone" dataKey="revenue" stroke="#1a2b5f" strokeWidth={2.5} fill="url(#colorRevenue)" dot={{ fill: '#1a2b5f', r: 3, strokeWidth: 0 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-300 dark:text-slate-600">
                                            <div className="text-center">
                                                <span className="material-symbols-outlined text-3xl">bar_chart</span>
                                                <p className="text-xs mt-1">No revenue data yet</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col gap-4 transition-colors">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Today's Summary</h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-primary/5 dark:bg-primary/20 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary dark:text-primary-300 text-[18px]">event</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Today's Appointments</span>
                                        </div>
                                        <span className="text-lg font-bold text-primary">{s.todayAppointments}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-600 text-[18px]">dentistry</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total Treatments</span>
                                        </div>
                                        <span className="text-lg font-bold text-blue-600">${parseFloat(s.totalTreatments || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-600 text-[18px]">account_balance_wallet</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total Paid</span>
                                        </div>
                                        <span className="text-lg font-bold text-emerald-600">${parseFloat(s.totalPaid || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-500/10 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-rose-500 text-[18px]">credit_card_off</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Balance Due</span>
                                        </div>
                                        <span className="text-lg font-bold text-rose-500">${parseFloat(s.totalDebt || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-500 text-[18px]">person</span>
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total Braces</span>
                                        </div>
                                        <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{s.totalCustomers}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Upcoming Appointments */}
                {!loading && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Upcoming Appointments</h4>
                            <a href="/appointments" className="text-primary dark:text-primary-400 text-xs font-semibold hover:underline">View Schedule</a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-400 text-[10px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-2.5 font-semibold">Customer</th>
                                        <th className="px-5 py-2.5 font-semibold">Visit Date</th>
                                        <th className="px-5 py-2.5 font-semibold">Next Visit</th>
                                        <th className="px-5 py-2.5 font-semibold">Reminder</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {appointments && appointments.length > 0 ? appointments.map((apt) => (
                                        <tr key={apt.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{apt.customer_name || `#${apt.customer_id}`}</p>
                                                {apt.customer_phone && <p className="text-[11px] text-slate-400">{apt.customer_phone}</p>}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{apt.visit_date || '—'}</td>
                                            <td className="px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{apt.next_visit || '—'}</td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${apt.reminder ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                    {apt.reminder ? 'ON' : 'OFF'}
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-400 text-sm">No upcoming appointments</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
