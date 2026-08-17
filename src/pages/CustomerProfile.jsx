import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Receipt from '../components/Receipt';
import TreatmentTeethPicker from '../components/TreatmentTeethPicker';
import { getCustomerProfile, createPayment, deletePayment, createCustomerTreatment, getTreatments, saveToothRecord } from '../services/api';
import { showSuccess, showError } from '../utils/toast';

const colors = ['bg-primary text-white', 'bg-accent text-white', 'bg-amber-500 text-white', 'bg-emerald-500 text-white', 'bg-purple-500 text-white', 'bg-rose-500 text-white', 'bg-blue-500 text-white'];

function getInitials(name) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function CustomerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [activeTab, setActiveTab] = useState('treatments');
    const [showPayModal, setShowPayModal] = useState(false);
    const [showAddTreatment, setShowAddTreatment] = useState(false);
    const [showReceipt, setShowReceipt] = useState(null);
    const [allTreatments, setAllTreatments] = useState([]);

    // Payment form
    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('Cash');
    const [payError, setPayError] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [payIdempotencyKey, setPayIdempotencyKey] = useState('');
    const [discardLoading, setDiscardLoading] = useState(false);
    const [txLoading, setTxLoading] = useState(false);

    // Add treatment form — uses TreatmentTeethPicker items + discount
    const [treatmentItems, setTreatmentItems] = useState([{ treatment_id: '', treatment_name: '', teeth: '' }]);
    const [txDiscount, setTxDiscount] = useState('');
    const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
    const [txNotes, setTxNotes] = useState('');
    const [txError, setTxError] = useState('');

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const data = await getCustomerProfile(id);
            setProfile(data);
        } catch (err) {
            console.error(err);
            setLoadError(err.message || 'Failed to load customer profile');
        }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchProfile(); }, [id]);
    useEffect(() => {
        getTreatments().then(data => setAllTreatments(Array.isArray(data) ? data : data.rows || [])).catch(() => { });
    }, []);

    const refreshProfile = async () => {
        try {
            const data = await getCustomerProfile(id);
            setProfile(data);
        } catch (err) { console.error(err); }
    };

    const handlePay = async () => {
        setPayError('');
        const amt = parseFloat(payAmount);
        if (!payAmount || amt <= 0) { setPayError('Enter a valid amount'); return; }
        const remaining = profile?.financials?.balance || 0;
        if (remaining <= 0) { setPayError('This account is fully paid. No payment needed.'); return; }
        if (amt > remaining) { setPayError(`Amount exceeds the remaining balance of $${remaining.toFixed(2)}.`); return; }
        try {
            setPayLoading(true);
            await createPayment({ customer_id: parseInt(id), amount: amt, method: payMethod, idempotency_key: payIdempotencyKey });
            setShowPayModal(false);
            setPayAmount('');
            showSuccess('Payment recorded successfully!');
            refreshProfile();
        } catch (err) { setPayError(err.message); showError(err.message); }
        finally { setPayLoading(false); }
    };

    const handleAddTreatment = async () => {
        setTxError('');
        if (txLoading) return; // prevent double-submit
        const validItems = treatmentItems.filter(i => i.treatment_name);
        if (validItems.length === 0) { setTxError('Select at least one treatment'); return; }

        // Frontend validation: ensure each item has a valid price
        for (const item of validItems) {
            const t = allTreatments.find(tr => tr.id === parseInt(item.treatment_id));
            const unitPrice = t ? parseFloat(t.price) : 0;
            if (isNaN(unitPrice) || unitPrice <= 0) {
                setTxError(`Treatment "${item.treatment_name}" has no valid price set.`);
                return;
            }
        }

        try {
            setTxLoading(true);
            const totalDiscount = parseFloat(txDiscount) || 0;

            // Pre-calculate each treatment's subtotal for proportional discount distribution
            const itemDetails = validItems.map(item => {
                const t = allTreatments.find(tr => tr.id === parseInt(item.treatment_id));
                const unitPrice = t ? parseFloat(t.price) : 0;
                const isFixed = t?.pricing_type === 'fixed';
                const teethArr = item.teeth ? item.teeth.split(',').map(s => s.trim()).filter(Boolean) : [];
                const qty = isFixed ? 1 : Math.max(1, teethArr.length);
                const subtotal = unitPrice * qty;
                return { item, t, unitPrice, isFixed, teethArr, qty, subtotal };
            });

            const grandSubtotal = itemDetails.reduce((sum, d) => sum + d.subtotal, 0);

            for (const detail of itemDetails) {
                // Distribute discount proportionally based on each treatment's share
                const discount = grandSubtotal > 0 && totalDiscount > 0
                    ? Math.round((totalDiscount * (detail.subtotal / grandSubtotal)) * 100) / 100
                    : 0;

                await createCustomerTreatment(id, {
                    treatment_id: detail.item.treatment_id || null,
                    service_name: detail.item.treatment_name,
                    teeth: detail.teethArr.length > 0 ? detail.teethArr : null,
                    quantity: detail.qty,
                    unit_price: detail.unitPrice,
                    discount: discount,
                    treatment_date: txDate,
                    notes: txNotes,
                    status: 'Completed',
                });

                if (detail.teethArr.length > 0) {
                    await Promise.allSettled(detail.teethArr.map(toothId =>
                        saveToothRecord({
                            customer_id: id,
                            tooth_id: toothId,
                            treatment_type: detail.item.treatment_name,
                            notes: txNotes,
                            status: 'Completed',
                        })
                    ));
                }
            }

            setShowAddTreatment(false);
            setTreatmentItems([{ treatment_id: '', treatment_name: '', teeth: '' }]);
            setTxDiscount('');
            setTxNotes('');
            setTxDate(new Date().toISOString().split('T')[0]);
            showSuccess('Treatment(s) saved successfully!');
            refreshProfile();
        } catch (err) { setTxError(err.message); showError(err.message); }
        finally { setTxLoading(false); }
    };

    const [confirmDiscard, setConfirmDiscard] = useState(null);

    const handleDeletePayment = async (paymentId) => {
        setConfirmDiscard(paymentId);
    };

    const executeDiscard = async () => {
        if (discardLoading) return; // prevent double-click
        const paymentId = confirmDiscard;
        setConfirmDiscard(null);
        try {
            setDiscardLoading(true);
            await deletePayment(paymentId);
            showSuccess('Payment discarded successfully');
            refreshProfile();
        } catch (err) {
            showError('Failed to discard payment: ' + err.message);
        } finally {
            setDiscardLoading(false);
        }
    };

    // Compute discount preview — respects pricing_type and teeth count
    const countTeeth = (teethStr) => {
        if (!teethStr || !teethStr.trim()) return 0;
        return teethStr.split(',').map(s => s.trim()).filter(Boolean).length;
    };
    const computeTotal = () => {
        let subtotal = 0;
        for (const item of treatmentItems) {
            if (item.treatment_id) {
                const t = allTreatments.find(tr => tr.id === parseInt(item.treatment_id));
                if (t) {
                    const price = parseFloat(t.price);
                    if (t.pricing_type === 'fixed') {
                        subtotal += price;
                    } else {
                        const teeth = countTeeth(item.teeth);
                        subtotal += price * (teeth || 1);
                    }
                }
            }
        }
        const disc = parseFloat(txDiscount) || 0;
        return { subtotal, discount: disc, total: subtotal - disc };
    };

    if (loading) {
        return (
            <>
                <Header title="Customer Profile" />
                <div className="flex-1 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span>
                </div>
            </>
        );
    }

    if (loadError || !profile) {
        return (
            <>
                <Header title="Customer Profile">
                    <button onClick={() => navigate('/customers')} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>Back
                    </button>
                </Header>
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
                    <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">{loadError ? 'error' : 'person_off'}</span>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">{loadError || 'Customer not found.'}</p>
                    {loadError && <button onClick={fetchProfile} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">Retry</button>}
                </div>
            </>
        );
    }

    const c = profile.customer;
    const { treatments, payments, financials } = profile;
    const tabs = [
        { key: 'treatments', label: 'Treatment History', icon: 'medical_services', count: treatments.length },
        { key: 'payments', label: 'Payment History', icon: 'payments', count: payments.length },
    ];

    const inputClass = "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary";

    return (
        <>
            <Header title="Customer Profile">
                <button onClick={() => navigate('/customers')} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>Back
                </button>
            </Header>

            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
                {/* Customer Info Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-accent p-5 flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl ${colors[parseInt(id) % colors.length]} shadow-lg`}>
                            {getInitials(c.name)}
                        </div>
                        <div className="flex-1 text-white">
                            <h2 className="text-xl font-bold">{c.name}</h2>
                            <div className="flex items-center gap-4 mt-1 text-sm text-white/80">
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">badge</span>ID: #{c.id}</span>
                                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">phone</span>{c.phone}</span>
                            </div>
                        </div>
                        {financials.balance > 0 && (
                            <button onClick={() => {
                                // Generate fresh idempotency key each time modal opens
                                setPayIdempotencyKey(`pay-${Date.now()}-${Math.random().toString(36).slice(2)}`);
                                setShowPayModal(true);
                                setPayAmount(financials.balance.toFixed(2));
                                setPayError('');
                            }}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-bold border border-white/30 flex items-center gap-1.5 transition-all">
                                <span className="material-symbols-outlined text-[18px]">payments</span>Record Payment
                            </button>
                        )}
                    </div>
                    <div className="p-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</p>
                                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${c.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'}`}>{c.status}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Treatments</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">${financials.totalTreatments.toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Paid</p>
                                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">${financials.totalPayments.toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Balance Due</p>
                                    {financials.balance === 0 && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded text-[9px] font-bold tracking-wider">PAID</span>}
                                    {financials.balance > 0 && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 rounded text-[9px] font-bold tracking-wider">UNPAID</span>}
                                    {financials.balance < 0 && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 rounded text-[9px] font-bold tracking-wider">CREDIT</span>}
                                </div>
                                <p className={`text-xl font-bold ${financials.balance > 0 ? 'text-rose-600 dark:text-rose-500' : financials.balance < 0 ? 'text-blue-600 dark:text-blue-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                                    ${Math.abs(financials.balance).toFixed(2)}
                                </p>
                            </div>
                        </div>
                        {c.notes && (
                            <div className="mt-4">
                                <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">note</span>{c.notes}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="flex border-b border-slate-100 dark:border-slate-700">
                        {tabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all ${activeTab === tab.key
                                    ? 'border-primary text-primary dark:text-primary-400'
                                    : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                                {tab.label}
                                {tab.count !== null && <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold">{tab.count}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Treatment History Tab */}
                    {activeTab === 'treatments' && (
                        <div>
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                <p className="text-sm text-slate-500 dark:text-slate-400">All treatments received by this customer</p>
                                <button onClick={() => { setShowAddTreatment(true); setTxError(''); }}
                                    className="px-4 py-2 bg-primary hover:bg-primary-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">add</span>Add Treatment
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[700px]">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3 font-semibold">Service</th>
                                            <th className="px-5 py-3 font-semibold">Teeth</th>
                                            <th className="px-5 py-3 font-semibold text-center">Qty</th>
                                            <th className="px-5 py-3 font-semibold text-right">Discount</th>
                                            <th className="px-5 py-3 font-semibold">Date</th>
                                            <th className="px-5 py-3 font-semibold text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {treatments.map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-5 py-3">
                                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded text-[11px] font-semibold">{t.service_name}</span>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">
                                                    {t.teeth ? (typeof t.teeth === 'string' ? JSON.parse(t.teeth) : t.teeth).join(', ') : '-'}
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300 text-center">{t.quantity}</td>
                                                <td className="px-5 py-3 text-sm text-right">
                                                    {parseFloat(t.discount || 0) > 0
                                                        ? <span className="text-rose-500 font-semibold">${parseFloat(t.discount).toFixed(2)}</span>
                                                        : <span className="text-slate-400">—</span>
                                                    }
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{t.treatment_date || '—'}</td>
                                                <td className="px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 text-right">${parseFloat(t.total).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        {treatments.length === 0 && (
                                            <tr><td colSpan="7" className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No treatments recorded yet</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Payment History Tab */}
                    {activeTab === 'payments' && (() => {
                        const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
                        return (
                            <div>
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Total Paid</p>
                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">${totalPaid.toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Payments</p>
                                        <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{payments.length}</p>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[500px]">
                                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                                            <tr>
                                                <th className="px-5 py-3 font-semibold">ID</th>
                                                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                                                <th className="px-5 py-3 font-semibold">Method</th>
                                                <th className="px-5 py-3 font-semibold">Date</th>
                                                <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            {payments.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                                    <td className="px-5 py-3 text-sm font-semibold text-primary dark:text-primary-400">#{p.id}</td>
                                                    <td className="px-5 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-500 text-right">${parseFloat(p.amount).toFixed(2)}</td>
                                                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{p.method}</td>
                                                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const printItems = treatments.map(t => {
                                                                        const origPrice = parseFloat(t.unit_price || 0);
                                                                        const qty = t.quantity || 1;
                                                                        const disc = parseFloat(t.discount || 0);
                                                                        const finalPrice = disc > 0 ? (origPrice * qty - disc) / qty : origPrice;
                                                                        return {
                                                                            name: t.service_name,
                                                                            qty: qty,
                                                                            price: finalPrice,
                                                                            origPrice: origPrice,
                                                                            discount: disc,
                                                                            teeth: t.teeth || '',
                                                                        };
                                                                    });
                                                                    setShowReceipt({
                                                                        customer: { ...profile.customer },
                                                                        items: printItems.length > 0 ? printItems : [{ name: 'Dental Payment', qty: 1, price: parseFloat(p.amount), origPrice: parseFloat(p.amount), discount: 0 }],
                                                                        payment: { amount: parseFloat(p.amount), method: p.method, date: p.created_at },
                                                                        isFirstPayment: p.id === payments[payments.length - 1].id
                                                                    });
                                                                }}
                                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-bold transition-colors flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                                                                <span className="material-symbols-outlined text-[14px]">print</span> Print
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePayment(p.id)}
                                                                className="px-2 py-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors opacity-80 group-hover:opacity-100"
                                                                title="Discard Payment">
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {payments.length === 0 && (
                                                <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No payments recorded yet</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Receipt Modal */}
            {showReceipt && <Receipt customer={showReceipt.customer} items={showReceipt.items} payment={showReceipt.payment} isFirstPayment={showReceipt.isFirstPayment} actualBalance={financials.balance} onClose={() => setShowReceipt(null)} />}

            {/* Record Payment Modal */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Record Payment</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Customer ID: <span className="font-bold text-primary">#{c.id}</span> — {c.name}</p>
                            </div>
                            <button onClick={() => setShowPayModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500"><span className="material-symbols-outlined">close</span></button>
                        </div>

                        {financials.balance <= 0 ? (
                            <div className="mb-4 flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl">
                                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">check_circle</span>
                                <div>
                                    <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Account is Fully Paid</p>
                                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Any payment recorded will be added as a CREDIT.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4 flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Remaining Balance</span>
                                <span className="text-lg font-bold text-rose-600 dark:text-rose-500">${financials.balance.toFixed(2)}</span>
                            </div>
                        )}

                        {payError && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 p-2 rounded-lg mb-4">{payError}</p>}

                        {(parseFloat(payAmount) > financials.balance && financials.balance > 0) && (
                            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl flex gap-2">
                                <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-[18px]">error</span>
                                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                                    Cannot exceed the remaining balance of ${financials.balance.toFixed(2)}.
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Amount Paid</label><input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className={inputClass + " font-bold"} placeholder="0.00" /></div>
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Payment Method</label>
                                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={inputClass}>
                                    <option>Cash</option><option>Zaad</option><option>Edahab</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button onClick={handlePay} disabled={payLoading} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">payments</span>
                                {payLoading ? 'Processing...' : 'Confirm Payment'}
                            </button>
                            <button onClick={() => setShowPayModal(false)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Treatment Modal — uses TreatmentTeethPicker */}
            {showAddTreatment && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">medical_services</span>
                                Add Treatment
                            </h3>
                            <button onClick={() => setShowAddTreatment(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {txError && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg mb-4 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">error</span>{txError}</p>}

                        <div className="space-y-4">
                            {/* Treatments & Dental Chart — same as Appointments/Debts */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Treatments & Dental Chart</p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                                    <TreatmentTeethPicker
                                        treatments={allTreatments}
                                        items={treatmentItems}
                                        onChange={setTreatmentItems}
                                    />
                                </div>
                            </div>

                            {/* Date & Discount */}
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pricing & Schedule</p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Discount ($)</label>
                                            <input type="number" step="0.01" min="0" value={txDiscount} onChange={e => setTxDiscount(e.target.value)}
                                                className={inputClass} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Treatment Date</label>
                                            <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className={inputClass} />
                                        </div>
                                    </div>

                                    {/* Price summary */}
                                    {(() => {
                                        const { subtotal, discount, total } = computeTotal();
                                        if (subtotal > 0) {
                                            return (
                                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                                        <span>Subtotal</span>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">${subtotal.toFixed(2)}</span>
                                                    </div>
                                                    {discount > 0 && (
                                                        <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                            <span>Discount</span>
                                                            <span className="font-bold">−${discount.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-slate-100 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                        <span>Total</span>
                                                        <span className={discount > 0 ? 'text-emerald-600' : ''}>${total.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Notes</label>
                                <input value={txNotes} onChange={e => setTxNotes(e.target.value)} className={inputClass} placeholder="Optional notes..." />
                            </div>
                        </div>

                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setShowAddTreatment(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                            <button onClick={handleAddTreatment} disabled={txLoading} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2">
                                {txLoading ? 'Saving...' : 'Save Treatment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Discard Payment Confirmation Modal */}
            {confirmDiscard && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-rose-500 text-[32px]">warning</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Discard Payment?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This action cannot be undone. The payment will be permanently removed and the customer's balance will be updated.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDiscard(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={executeDiscard} disabled={discardLoading} className="flex-1 py-2.5 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-60">
                                {discardLoading ? 'Discarding...' : 'Yes, Discard'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
