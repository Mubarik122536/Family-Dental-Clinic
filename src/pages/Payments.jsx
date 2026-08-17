import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { getPayments, createPayment, getPaymentStats } from '../services/api';
import { showSuccess, showError } from '../utils/toast';
import CustomerSelect from '../components/CustomerSelect';

export default function Payments() {
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({ total_received: 0, total_pending: 0, total_refunded: 0, total_transactions: 0 });
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('All Receipts');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPayment, setNewPayment] = useState({ customer_id: '', amount: '', method: 'Cash', notes: '' });
    const [error, setError] = useState('');

    // Calculate date range for filter
    const getDateRange = () => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        const dayOfWeek = today.getDay(); // 0=Sun

        switch (dateFilter) {
            case 'Today': return { from: fmt(today), to: fmt(today) };
            case 'Yesterday': {
                const y = new Date(today); y.setDate(y.getDate() - 1);
                return { from: fmt(y), to: fmt(y) };
            }
            case 'This Week': {
                const start = new Date(today); start.setDate(start.getDate() - dayOfWeek);
                return { from: fmt(start), to: fmt(today) };
            }
            case 'Last Week': {
                const end = new Date(today); end.setDate(end.getDate() - dayOfWeek - 1);
                const start = new Date(end); start.setDate(start.getDate() - 6);
                return { from: fmt(start), to: fmt(end) };
            }
            case 'This Month': {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                return { from: fmt(start), to: fmt(today) };
            }
            case 'Last Month': {
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                return { from: fmt(start), to: fmt(end) };
            }
            case 'Last 30 Days': { const d = new Date(today); d.setDate(d.getDate() - 30); return { from: fmt(d), to: fmt(today) }; }
            case 'Last 90 Days': { const d = new Date(today); d.setDate(d.getDate() - 90); return { from: fmt(d), to: fmt(today) }; }
            case 'Year to Date': {
                const start = new Date(today.getFullYear(), 0, 1);
                return { from: fmt(start), to: fmt(today) };
            }
            case 'Custom': return { from: customFrom, to: customTo };
            default: return {};
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {};
            if (search) params.search = search;
            const range = getDateRange();
            if (range.from) params.from = range.from;
            if (range.to) params.to = range.to;
            const [paymentsData, statsData] = await Promise.all([getPayments(params), getPaymentStats()]);
            setPayments(paymentsData);
            setStats(statsData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [dateFilter, search, customFrom, customTo]);

    const handleAdd = async () => {
        try {
            setError('');
            if (!newPayment.customer_id || !newPayment.amount) { setError('Customer and amount are required'); return; }
            await createPayment({ ...newPayment, amount: parseFloat(newPayment.amount) });
            setShowAddModal(false);
            setNewPayment({ customer_id: '', amount: '', method: 'Cash', notes: '' });
            showSuccess('Payment recorded!');
            fetchData();
        } catch (err) {
            setError(err.message); showError(err.message);
        }
    };

    const methodIcons = { 'Cash': 'payments', 'Credit Card': 'credit_card', 'Bank Transfer': 'account_balance', 'Insurance': 'health_and_safety', 'Zaad': 'phone_android', 'E-Dahab': 'phone_android' };

    const dateFilters = ['All Receipts', 'Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'Last 30 Days', 'Last 90 Days', 'Year to Date', 'Custom'];

    return (
        <>
            <Header title="Payments">
                <button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary-700 text-white px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Record Payment
                </button>
            </Header>
            <div className="p-6 flex-1 space-y-5 overflow-y-auto">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Total Received</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">${parseFloat(stats.total_received).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Pending</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-500 mt-1">${parseFloat(stats.total_pending).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Refunded</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1">${parseFloat(stats.total_refunded).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Total Transactions</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{stats.total_transactions}</p>
                    </div>
                </div>

                {/* Table with date filters */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-sm">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Search payment or customer..." />
                            </div>
                            {/* Date filter dropdown */}
                            <div className="relative">
                                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                                    className="appearance-none pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer">
                                    {dateFilters.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">expand_more</span>
                            </div>
                        </div>
                        {/* Custom date inputs */}
                        {dateFilter === 'Custom' && (
                            <div className="flex items-center gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">From</label>
                                    <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">To</label>
                                    <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20" />
                                </div>
                            </div>
                        )}
                    </div>
                    {loading ? (
                        <div className="p-12 text-center"><span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span></div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3 font-semibold">ID</th>
                                    <th className="px-5 py-3 font-semibold">Customer</th>
                                    <th className="px-5 py-3 font-semibold">Date</th>
                                    <th className="px-5 py-3 font-semibold">Amount</th>
                                    <th className="px-5 py-3 font-semibold">Method</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-5 py-4 text-sm font-semibold text-primary dark:text-primary-400">#{p.id}</td>
                                        <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{p.customer_name || '-'}</td>
                                        <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                                        <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">${parseFloat(p.amount).toFixed(2)}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">{methodIcons[p.method] || 'payments'}</span>
                                                {p.method}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {payments.length === 0 && <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No payments found</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Payment Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Record Payment</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><span className="material-symbols-outlined text-slate-400 dark:text-slate-500">close</span></button>
                        </div>
                        {error && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg mb-3">{error}</p>}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Customer *</label>
                                <CustomerSelect value={newPayment.customer_id} onChange={(id) => setNewPayment({ ...newPayment, customer_id: id })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Amount *</label><input type="number" value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="$0.00" /></div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Method</label>
                                    <select value={newPayment.method} onChange={e => setNewPayment({ ...newPayment, method: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                        <option>Cash</option><option>Credit Card</option><option>Bank Transfer</option><option>Insurance</option><option>Zaad</option><option>E-Dahab</option>
                                    </select>
                                </div>
                            </div>
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Notes</label><textarea value={newPayment.notes} onChange={e => setNewPayment({ ...newPayment, notes: e.target.value })} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 resize-none" rows={2} /></div>
                        </div>
                        <button onClick={handleAdd} className="w-full mt-4 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors">Record Payment</button>
                    </div>
                </div>
            )}
        </>
    );
}
