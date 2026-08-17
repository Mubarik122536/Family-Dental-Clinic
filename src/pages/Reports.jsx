import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDashboardStats, getRevenueChart, getPaymentStats } from '../services/api';

const COLORS = ['#1a2b5f', '#56b8d9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

export default function Reports() {
    const [stats, setStats] = useState({ totalCustomers: 0, todayAppointments: 0, totalTreatments: 0, totalPaid: 0, totalDebt: 0 });
    const [revenueData, setRevenueData] = useState([]);
    const [paymentStats, setPaymentStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getDashboardStats(),
            getRevenueChart(),
            getPaymentStats(),
        ]).then(([s, r, p]) => {
            setStats(s);
            setRevenueData(r);
            setPaymentStats(p);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    // Build payment method breakdown — will be empty until backend provides by_method
    const methodBreakdown = paymentStats?.by_method?.length > 0
        ? paymentStats.by_method.map((m, i) => ({ name: m.method || 'Other', value: parseFloat(m.total_amount || 0), color: COLORS[i % COLORS.length] }))
        : [];

    // Revenue chart data formatted
    const chartData = revenueData.length > 0 ? revenueData.map(d => ({ month: d.month, revenue: parseFloat(d.revenue || 0) })) : [];

    return (
        <>
            <Header title="Reports & Analytics">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        Export PDF
                    </button>
                </div>
            </Header>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Loading reports...</p>
                    </div>
                </div>
            ) : (
                <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                    {/* Summary Cards — live data */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm transition-colors">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Treatments</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">${parseFloat(stats.totalTreatments || 0).toLocaleString()}</h3>
                            <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">Live from database</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm transition-colors">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Today's Appointments</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.todayAppointments}</h3>
                            <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">Live from database</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm transition-colors">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Braces</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.totalCustomers}</h3>
                            <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">Live from database</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm transition-colors">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance Due</p>
                            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1">${parseFloat(stats.totalDebt || 0).toLocaleString()}</h3>
                            <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">Outstanding balances</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Chart — live */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Revenue Growth</h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Monthly revenue from invoices</p>
                            <div className="h-56">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#1a2b5f" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#1a2b5f" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={v => [`$${parseFloat(v).toLocaleString()}`, 'Revenue']} />
                                            <Area type="monotone" dataKey="revenue" stroke="#1a2b5f" strokeWidth={2.5} fill="url(#gradRev)" dot={{ fill: '#1a2b5f', r: 3, strokeWidth: 0 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">No revenue data yet</div>
                                )}
                            </div>
                        </div>

                        {/* Payment Method Breakdown — live */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Payment Methods</h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Revenue by payment method</p>
                            {methodBreakdown.length > 0 ? (
                                <div className="flex items-center gap-6">
                                    <div className="h-48 w-48 flex-shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={methodBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                                                    {methodBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={v => [`$${parseFloat(v).toLocaleString()}`, '']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        {methodBreakdown.map((m, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }}></div>
                                                <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">{m.name}</span>
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">${m.value.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">No payment data yet</div>
                            )}
                        </div>

                        {/* Total collected vs pending — live */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 lg:col-span-2 transition-colors">
                            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">Collections Summary</h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Total collected vs outstanding balances</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-5 text-center">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Total Collected</p>
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">${parseFloat(paymentStats?.total_received || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-500/10 rounded-xl p-5 text-center">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Outstanding Debt</p>
                                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-500">${parseFloat(stats.totalDebt || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-5 text-center">
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Total Transactions</p>
                                    <p className="text-2xl font-bold text-primary dark:text-primary-400">{paymentStats?.total_transactions || 0}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
