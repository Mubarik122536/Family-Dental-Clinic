import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { getExpenses, createExpense, deleteExpense, getFinancialSummary } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/toast';

export default function Expenses() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    const [saving, setSaving] = useState(false);
    const [summary, setSummary] = useState(null);

    const buildParams = () => {
        if (period === 'custom') {
            return { period: 'custom', from: dateFrom, to: dateTo };
        }
        return { period };
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = buildParams();
            const [exp, sum] = await Promise.all([
                getExpenses(params),
                getFinancialSummary(params),
            ]);
            setExpenses(Array.isArray(exp) ? exp : []);
            setSummary(sum);
        } catch (err) { console.error(err); showError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [period, dateFrom, dateTo]);

    const handlePeriodChange = (value) => {
        if (value !== 'custom') {
            setDateFrom('');
            setDateTo('');
        }
        setPeriod(value);
    };

    const handleAdd = async () => {
        if (!form.amount || !form.description) { showError('Amount and description are required'); return; }
        setSaving(true);
        try {
            await createExpense(form);
            showSuccess('Expense added!');
            setShowAdd(false);
            setForm({ amount: '', description: '', date: new Date().toISOString().split('T')[0] });
            fetchData();
        } catch (err) { showError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        const ok = await showConfirm('Delete this expense?');
        if (!ok) return;
        try {
            await deleteExpense(id);
            showSuccess('Expense deleted!');
            fetchData();
        } catch (err) { showError(err.message); }
    };

    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const inputClass = "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

    return (
        <>
            <Header title="Expenses">
                <button onClick={() => setShowAdd(true)} className="bg-primary hover:bg-primary-700 text-white px-3 md:px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span className="hidden md:inline">Add Expense</span>
                </button>
            </Header>

            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
                {/* Period Filter */}
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { label: 'Today', value: 'today' },
                        { label: 'This Month', value: 'month' },
                        { label: 'All Time', value: 'all' },
                        { label: 'Custom', value: 'custom' },
                    ].map(f => (
                        <button key={f.value} onClick={() => handlePeriodChange(f.value)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${period === f.value
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Custom Date Range */}
                {period === 'custom' && (
                    <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <div className="flex-1 min-w-[140px]">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">From</label>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                        </div>
                        <div className="flex-1 min-w-[140px]">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">To</label>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                        </div>
                        {(dateFrom || dateTo) && (
                            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                className="px-3 py-2 text-xs text-rose-600 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {/* Financial Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-500 text-[18px]">groups</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Braces</p>
                            </div>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">${summary.braces.toFixed(2)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-amber-500 text-[18px]">account_balance</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Debt Payments</p>
                            </div>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">${summary.debt.toFixed(2)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-500 text-[18px]">point_of_sale</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cash</p>
                            </div>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">${summary.cash.toFixed(2)}</p>
                        </div>
                    </div>
                )}

                {/* Grand Financial Summary */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-primary to-primary-700 rounded-xl p-5 text-white shadow-lg shadow-primary/20">
                            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Grand Total Income</p>
                            <p className="text-3xl font-bold mt-1">${summary.grandTotal.toFixed(2)}</p>
                            <p className="text-[11px] opacity-60 mt-1">Braces + Debt + Cash</p>
                        </div>
                        <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl p-5 text-white shadow-lg shadow-rose-500/20">
                            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Total Expenses</p>
                            <p className="text-3xl font-bold mt-1">${summary.expenses.toFixed(2)}</p>
                            <p className="text-[11px] opacity-60 mt-1">All recorded expenses</p>
                        </div>
                        <div className={`bg-gradient-to-br ${summary.netProfit >= 0 ? 'from-emerald-500 to-emerald-700 shadow-emerald-500/20' : 'from-red-600 to-red-800 shadow-red-500/20'} rounded-xl p-5 text-white shadow-lg`}>
                            <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Net Profit</p>
                            <p className="text-3xl font-bold mt-1">${summary.netProfit.toFixed(2)}</p>
                            <p className="text-[11px] opacity-60 mt-1">Income − Expenses</p>
                        </div>
                    </div>
                )}

                {/* Expenses List */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Expense Records</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">{expenses.length} entries • Total: ${totalExpenses.toFixed(2)}</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span>
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="py-16 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">receipt_long</span>
                            <p className="text-sm text-slate-400 mt-2">No expenses recorded</p>
                            <p className="text-[11px] text-slate-300 dark:text-slate-500 mt-1">Click "Add Expense" to start tracking</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {expenses.map(exp => (
                                <div key={exp.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-rose-500 text-[18px]">remove_circle</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{exp.description}</p>
                                            <p className="text-[11px] text-slate-400">{exp.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">−${parseFloat(exp.amount).toFixed(2)}</span>
                                        <button onClick={() => handleDelete(exp.id)}
                                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Expense Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-rose-500">receipt_long</span>
                                Add Expense
                            </h3>
                            <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Date</label>
                                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Amount ($)</label>
                                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputClass} placeholder="0.00" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Description</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass + " resize-none"} rows={3} placeholder="e.g. Office supplies, Electricity bill..." />
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50">
                                {saving ? 'Saving...' : 'Save Expense'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
