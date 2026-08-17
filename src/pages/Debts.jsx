import { useState, useEffect } from 'react';
import Header from '../components/Header';
import DebtReceipt from '../components/DebtReceipt';
import DebtPaymentReceipt from '../components/DebtPaymentReceipt';
import { getDebts, createDebt, updateDebt, deleteDebt, getTreatments, getDebtPayments, createDebtPayment } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/toast';
import TreatmentTeethPicker from '../components/TreatmentTeethPicker';

export default function Debts() {
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editDebt, setEditDebt] = useState(null);
    const [dbTreatments, setDbTreatments] = useState([]);
    const [form, setForm] = useState({ name: '', phone: '', discount: '', due_date: '' });
    const [treatmentItems, setTreatmentItems] = useState([{ treatment_id: '', treatment_name: '', teeth: '' }]);
    const [error, setError] = useState('');
    const [printDebt, setPrintDebt] = useState(null);
    const [printPayment, setPrintPayment] = useState(null);

    // Payment modal state
    const [payDebt, setPayDebt] = useState(null);
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('Cash');
    const [payNotes, setPayNotes] = useState('');
    const [payError, setPayError] = useState('');
    const [payLoading, setPayLoading] = useState(false);

    // Payment history modal
    const [historyDebt, setHistoryDebt] = useState(null);
    const [historyPayments, setHistoryPayments] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchDebts = async () => {
        try {
            setLoading(true);
            const data = await getDebts({ search, status: statusFilter !== 'All' ? statusFilter : '' });
            setDebts(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        getTreatments().then(data => setDbTreatments(Array.isArray(data) ? data : data.rows || [])).catch(() => { });
    }, []);

    useEffect(() => { const t = setTimeout(() => fetchDebts(), 300); return () => clearTimeout(t); }, [search, statusFilter]);

    const serializeTreatments = () => {
        const names = treatmentItems.filter(i => i.treatment_name).map(i => i.treatment_name);
        const allTeeth = treatmentItems.map(i => i.teeth).filter(Boolean);
        return {
            service_name: names.join(', '),
            teeth: allTeeth.join(', '),
            treatment_id: treatmentItems[0]?.treatment_id || null,
        };
    };

    const countTeeth = (teethStr) => {
        if (!teethStr || !teethStr.trim()) return 0;
        return teethStr.split(',').map(s => s.trim()).filter(Boolean).length;
    };

    const subtotal = treatmentItems.reduce((sum, item) => {
        if (!item.treatment_id) return sum;
        const t = dbTreatments.find(tr => tr.id === parseInt(item.treatment_id));
        if (!t) return sum;
        const price = parseFloat(t.price);
        if (t.pricing_type === 'fixed') return sum + price;
        const teethCount = countTeeth(item.teeth);
        return sum + (price * (teethCount || 1));
    }, 0);
    const discount = parseFloat(form.discount) || 0;
    const finalAmount = Math.max(0, subtotal - discount);

    const handleSave = async () => {
        setError('');
        const serialized = serializeTreatments();
        if (!form.name || !form.phone) { setError('Name and Phone are required'); return; }
        if (subtotal <= 0) { setError('Select at least one treatment'); return; }
        try {
            const payload = { name: form.name, phone: form.phone, amount: finalAmount, due_date: form.due_date || null, ...serialized };
            if (editDebt) {
                await updateDebt(editDebt.id, { ...payload, status: editDebt.status });
                showSuccess('Debt updated successfully!');
            } else {
                await createDebt(payload);
                showSuccess('Debt added successfully!');
            }
            setShowAddModal(false); setEditDebt(null);
            setForm({ name: '', phone: '', discount: '', due_date: '' });
            setTreatmentItems([{ treatment_id: '', treatment_name: '', teeth: '' }]);
            fetchDebts();
        } catch (err) { setError(err.message); showError(err.message); }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm('Delete Debt?', 'This will also delete all payment records for this debt.');
        if (!confirmed) return;
        try { await deleteDebt(id); showSuccess('Debt deleted'); fetchDebts(); } catch (err) { showError(err.message); }
    };

    // Partial payment handler
    const handleRecordPayment = async () => {
        setPayError('');
        const amt = parseFloat(payAmount);
        if (!amt || amt <= 0) { setPayError('Enter a valid amount'); return; }
        const remaining = parseFloat(payDebt.amount) - parseFloat(payDebt.paid_amount || 0);
        if (amt > remaining + 0.01) { setPayError(`Amount exceeds remaining balance of $${remaining.toFixed(2)}`); return; }
        try {
            setPayLoading(true);
            await createDebtPayment(payDebt.id, { amount: amt, method: payMethod, notes: payNotes });
            showSuccess('Payment recorded!');
            setPayDebt(null); setPayAmount(''); setPayNotes('');
            fetchDebts();
        } catch (err) { setPayError(err.message); showError(err.message); }
        finally { setPayLoading(false); }
    };

    // Payment history
    const openHistory = async (debt) => {
        setHistoryDebt(debt);
        setHistoryLoading(true);
        try {
            const payments = await getDebtPayments(debt.id);
            setHistoryPayments(payments);
        } catch (err) { setHistoryPayments([]); }
        finally { setHistoryLoading(false); }
    };

    const openEdit = (debt) => {
        setEditDebt(debt);
        setForm({ name: debt.name, phone: debt.phone, discount: '', due_date: debt.due_date || '' });

        const names = (debt.service_name || '').split(',').map(s => s.trim()).filter(Boolean);
        const teethStr = debt.teeth || '';

        if (names.length > 0) {
            setTreatmentItems(names.map((n, i) => {
                // Try matching by name first, then by treatment_id for the first item
                let t = dbTreatments.find(tr => tr.name === n);
                if (!t && i === 0 && debt.treatment_id) {
                    t = dbTreatments.find(tr => tr.id === parseInt(debt.treatment_id));
                }
                return {
                    treatment_id: t?.id ? String(t.id) : '',
                    treatment_name: t?.name || n,
                    teeth: i === 0 ? teethStr : '',  // all teeth belong to the debt as a whole
                };
            }));
        } else {
            // No service name — try to restore from treatment_id
            const t = debt.treatment_id ? dbTreatments.find(tr => tr.id === parseInt(debt.treatment_id)) : null;
            setTreatmentItems([{
                treatment_id: t?.id ? String(t.id) : '',
                treatment_name: t?.name || '',
                teeth: teethStr,
            }]);
        }
        setShowAddModal(true);
        setError('');
    };

    const openAdd = () => {
        setEditDebt(null);
        setForm({ name: '', phone: '', discount: '', due_date: '' });
        setTreatmentItems([{ treatment_id: '', treatment_name: '', teeth: '' }]);
        setShowAddModal(true);
        setError('');
    };

    const totalDebt = debts.filter(d => d.status !== 'Paid').reduce((s, d) => s + (parseFloat(d.amount || 0) - parseFloat(d.paid_amount || 0)), 0);
    const totalCollected = debts.reduce((s, d) => s + parseFloat(d.paid_amount || 0), 0);

    const getStatusBadge = (d) => {
        const paid = parseFloat(d.paid_amount || 0);
        const total = parseFloat(d.amount);
        if (paid >= total) return { label: 'PAID', cls: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' };
        if (paid > 0) return { label: 'PARTIAL', cls: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' };
        return { label: 'UNPAID', cls: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' };
    };

    return (
        <>
            <Header title="Debts">
                <button onClick={openAdd} className="bg-primary hover:bg-primary-700 text-white px-3 md:px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span className="hidden md:inline">Add Debt</span>
                </button>
            </Header>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Total Records</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{debts.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Unpaid / Partial</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1">{debts.filter(d => d.status !== 'Paid').length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Collected</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">${totalCollected.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Remaining Debt</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1">${totalDebt.toFixed(2)}</p>
                    </div>
                </div>

                {/* Search + Filter */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1 w-full max-w-md relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                placeholder="Search by name, phone, or service..." />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                            {['All', 'Unpaid', 'Paid'].map(s => (
                                <button key={s} onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${statusFilter === s ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 text-center"><span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span></div>
                        ) : (
                            <table className="w-full text-left min-w-[800px]">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">ID</th>
                                        <th className="px-5 py-3 font-semibold">Name</th>
                                        <th className="px-5 py-3 font-semibold">Phone</th>
                                        <th className="px-5 py-3 font-semibold text-right">Total</th>
                                        <th className="px-5 py-3 font-semibold text-right">Paid</th>
                                        <th className="px-5 py-3 font-semibold text-right">Remaining</th>
                                        <th className="px-5 py-3 font-semibold">Service</th>
                                        <th className="px-5 py-3 font-semibold">Due Date</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {debts.map(d => {
                                        const paid = parseFloat(d.paid_amount || 0);
                                        const total = parseFloat(d.amount);
                                        const remaining = Math.max(0, total - paid);
                                        const badge = getStatusBadge(d);
                                        const progressPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

                                        return (
                                            <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-5 py-3 text-sm font-semibold text-primary dark:text-primary-400">#{d.id}</td>
                                                <td className="px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{d.name}</td>
                                                <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{d.phone}</td>
                                                <td className="px-5 py-3 text-sm font-bold text-right text-slate-700 dark:text-slate-200">${total.toFixed(2)}</td>
                                                <td className="px-5 py-3 text-sm font-bold text-right text-emerald-600 dark:text-emerald-500">${paid.toFixed(2)}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={`text-sm font-bold ${remaining > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'}`}>${remaining.toFixed(2)}</span>
                                                    {/* Progress bar */}
                                                    {total > 0 && (
                                                        <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
                                                            <div className={`h-1 rounded-full transition-all ${progressPct >= 100 ? 'bg-emerald-500' : progressPct > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${progressPct}%` }}></div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3"><span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-[11px] font-semibold">{d.service_name}</span></td>
                                                <td className="px-5 py-3 text-sm">
                                                    {d.due_date ? (() => {
                                                        const today = new Date().toISOString().split('T')[0];
                                                        const isOverdue = d.due_date < today && badge.label !== 'PAID';
                                                        const isToday = d.due_date === today;
                                                        return (
                                                            <span className={`text-xs font-bold ${isOverdue ? 'text-rose-600 dark:text-rose-400' : isToday ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                {new Date(d.due_date + 'T00:00').toLocaleDateString()}
                                                                {isOverdue && <span className="ml-1 text-[9px]">⚠️</span>}
                                                                {isToday && <span className="ml-1 text-[9px]">📅</span>}
                                                            </span>
                                                        );
                                                    })() : <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        {/* Record Payment */}
                                                        {remaining > 0 && (
                                                            <button onClick={() => { setPayDebt(d); setPayAmount(''); setPayMethod('Cash'); setPayNotes(''); setPayError(''); }}
                                                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md text-emerald-600 dark:text-emerald-500 transition-colors" title="Record Payment">
                                                                <span className="material-symbols-outlined text-[16px]">payments</span>
                                                            </button>
                                                        )}
                                                        {/* Payment History */}
                                                        {paid > 0 && (
                                                            <button onClick={() => openHistory(d)}
                                                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-md text-blue-500 dark:text-blue-400 transition-colors" title="Payment History">
                                                                <span className="material-symbols-outlined text-[16px]">history</span>
                                                            </button>
                                                        )}
                                                        <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-md text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" title="Edit">
                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDelete(d.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors" title="Delete">
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>
                                                        <button onClick={() => setPrintDebt(d)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary-400 transition-colors" title="Print">
                                                            <span className="material-symbols-outlined text-[16px]">print</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {debts.length === 0 && !loading && (
                                        <tr><td colSpan="9" className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                                            {search ? 'No debts match your search.' : 'No debt records found.'}
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Record Payment Modal ── */}
            {payDebt && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">payments</span>
                                Record Payment
                            </h3>
                            <button onClick={() => setPayDebt(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Debt summary */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 mb-4 space-y-1">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{payDebt.name} — {payDebt.phone}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{payDebt.service_name}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700 mt-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Total: ${parseFloat(payDebt.amount).toFixed(2)}</span>
                                <span className="text-xs text-emerald-600 dark:text-emerald-500 font-bold">Paid: ${parseFloat(payDebt.paid_amount || 0).toFixed(2)}</span>
                                <span className="text-xs text-rose-600 dark:text-rose-500 font-bold">
                                    Remaining: ${(parseFloat(payDebt.amount) - parseFloat(payDebt.paid_amount || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {payError && <p className="text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">error</span>{payError}</p>}

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Amount *</label>
                                <input type="number" step="0.01" min="0" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="Enter payment amount..." autoFocus />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Method</label>
                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                                    {['Cash', 'Zaad', 'Edahab'].map(m => (
                                        <button key={m} type="button" onClick={() => setPayMethod(m)}
                                            className={`flex-1 px-3 py-2 rounded-md text-xs font-bold transition-all ${payMethod === m ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Notes (optional)</label>
                                <input value={payNotes} onChange={e => setPayNotes(e.target.value)}
                                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    placeholder="Optional note..." />
                            </div>
                            {/* Quick amount buttons */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Quick:</span>
                                {[() => {
                                    const rem = parseFloat(payDebt.amount) - parseFloat(payDebt.paid_amount || 0);
                                    return { label: 'Full', val: rem };
                                }, () => {
                                    const rem = parseFloat(payDebt.amount) - parseFloat(payDebt.paid_amount || 0);
                                    return { label: 'Half', val: Math.round(rem / 2 * 100) / 100 };
                                }].map((fn, i) => {
                                    const { label, val } = fn();
                                    return (
                                        <button key={i} type="button" onClick={() => setPayAmount(String(val))}
                                            className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-md text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors">
                                            {label} (${val.toFixed(2)})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setPayDebt(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleRecordPayment} disabled={payLoading}
                                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                {payLoading && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                                Record Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Payment History Modal ── */}
            {historyDebt && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-500">history</span>
                                Payment History — {historyDebt.name}
                            </h3>
                            <button onClick={() => setHistoryDebt(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Summary */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 mb-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Total Debt</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">${parseFloat(historyDebt.amount).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-slate-500 dark:text-slate-400">Total Paid</span>
                                <span className="font-bold text-emerald-600">${parseFloat(historyDebt.paid_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-slate-500 dark:text-slate-400">Remaining</span>
                                <span className="font-bold text-rose-600">${(parseFloat(historyDebt.amount) - parseFloat(historyDebt.paid_amount || 0)).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Payment list */}
                        {historyLoading ? (
                            <div className="text-center py-6"><span className="material-symbols-outlined text-3xl text-slate-300 animate-spin">progress_activity</span></div>
                        ) : historyPayments.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-6">No payments recorded yet</p>
                        ) : (
                            <div className="space-y-2">
                                {historyPayments.map((p, i) => (
                                    <div key={p.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[16px]">payments</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+${parseFloat(p.amount).toFixed(2)}</p>
                                                <p className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleString()} · {p.method}</p>
                                                {p.notes && <p className="text-[10px] text-slate-500">{p.notes}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setPrintPayment({ payment: p, debt: historyDebt })}
                                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md text-slate-400 hover:text-blue-500 transition-colors" title="Print Receipt">
                                                <span className="material-symbols-outlined text-[16px]">print</span>
                                            </button>
                                            <span className="text-xs font-bold text-slate-400">#{historyPayments.length - i}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add / Edit Debt Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary dark:text-primary-400">account_balance</span>
                                {editDebt ? 'Edit Debt' : 'Add Debt'}
                            </h3>
                            <button onClick={() => { setShowAddModal(false); setEditDebt(null); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        {error && <p className="text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">error</span>{error}</p>}

                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Information</p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Name *</label>
                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Full name" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Phone *</label>
                                        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="+252..." />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Treatments & Dental Chart</p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                    <TreatmentTeethPicker treatments={dbTreatments} items={treatmentItems} onChange={setTreatmentItems} />
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Financial</p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Subtotal</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">${subtotal.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Discount ($)</label>
                                        <input type="number" step="0.01" min="0" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="0.00" />
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Amount</span>
                                        <span className="text-lg font-bold text-rose-600 dark:text-rose-400">${finalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Promise</p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Due Date (optional)</label>
                                    <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                                    <p className="text-[10px] text-slate-400 mt-1.5">When the customer promises to pay. You'll get a notification on this date.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button onClick={() => { setShowAddModal(false); setEditDebt(null); }} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleSave} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary/20">{editDebt ? 'Update' : 'Save Debt'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Debt Receipt Print Modal */}
            {printDebt && <DebtReceipt debt={printDebt} onClose={() => setPrintDebt(null)} />}
            {printPayment && <DebtPaymentReceipt payment={printPayment.payment} debt={printPayment.debt} onClose={() => setPrintPayment(null)} />}
        </>
    );
}
