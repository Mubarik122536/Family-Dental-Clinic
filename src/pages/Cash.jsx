import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import Header from '../components/Header';
import TreatmentTeethPicker from '../components/TreatmentTeethPicker';
import { getTreatments, getCashTransactions, createCashTransaction, deleteCashTransaction } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/toast';

export default function Cash() {
    const [dbTreatments, setDbTreatments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(true);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [treatmentItems, setTreatmentItems] = useState([{ treatment_id: '', treatment_name: '', teeth: '' }]);
    const [discount, setDiscount] = useState('');
    const [payMethod, setPayMethod] = useState('Cash');
    const [saving, setSaving] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [reprintData, setReprintData] = useState(null);
    const [cashSearch, setCashSearch] = useState('');
    const [viewCustomer, setViewCustomer] = useState(null);
    const printRef = useRef(null);

    useEffect(() => {
        getTreatments().then(data => setDbTreatments(Array.isArray(data) ? data : data.rows || [])).catch(() => { });
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            setTxLoading(true);
            const data = await getCashTransactions();
            setTransactions(Array.isArray(data) ? data : []);
        } catch (_) { setTransactions([]); }
        finally { setTxLoading(false); }
    };

    // Count teeth from comma-separated string
    const countTeeth = (teethStr) => {
        if (!teethStr || !teethStr.trim()) return 0;
        return teethStr.split(',').map(s => s.trim()).filter(Boolean).length;
    };

    // Auto-calculate with pricing_type awareness
    const subtotal = treatmentItems.reduce((sum, item) => {
        if (!item.treatment_id) return sum;
        const t = dbTreatments.find(tr => tr.id === parseInt(item.treatment_id));
        if (!t) return sum;
        const price = parseFloat(t.price);
        if (t.pricing_type === 'fixed') return sum + price;
        const teethCount = countTeeth(item.teeth);
        return sum + (price * (teethCount || 1));
    }, 0);
    const disc = parseFloat(discount) || 0;
    const total = Math.max(0, subtotal - disc);

    const services = treatmentItems.filter(i => i.treatment_name).map(i => {
        const t = dbTreatments.find(tr => tr.id === parseInt(i.treatment_id));
        const price = t ? parseFloat(t.price) : 0;
        const isFixed = t?.pricing_type === 'fixed';
        const teethCount = countTeeth(i.teeth);
        const qty = isFixed ? 1 : (teethCount || 1);
        return { name: i.treatment_name, qty, price, lineTotal: isFixed ? price : price * qty };
    });

    const handleSaveAndPrint = async () => {
        if (services.length === 0) { showError('Select at least one treatment'); return; }
        if (saving) return;

        const serviceNames = services.map(s => s.name).join(', ');
        const teethStr = treatmentItems.map(i => i.teeth).filter(Boolean).join(', ');

        try {
            setSaving(true);
            const saved = await createCashTransaction({
                name: name || null,
                phone: phone || null,
                services: serviceNames,
                teeth: teethStr || null,
                subtotal, discount: disc, total,
                method: payMethod,
            });
            setLastSaved(saved);
            setShowReceipt(true);
            showSuccess('Transaction saved!');
            fetchTransactions();
        } catch (err) {
            showError(err.message);
        } finally { setSaving(false); }
    };

    const executePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const printCSS = `
            @page { size: A5 portrait; margin: 0; }
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .receipt-page { width: 100%; min-height: 100vh; display: flex; flex-direction: column; padding: 12mm 14mm; }
            table { width: 100%; border-collapse: collapse; }
            img { max-width: 100%; height: auto; }
        `;
        const win = window.open('', '_blank', 'width=700,height=900');
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Cash Receipt</title><style>${printCSS}</style></head><body>${content.innerHTML}</body></html>`);
        win.document.close();
        win.onload = () => { win.focus(); win.print(); };
    };

    const [sharing, setSharing] = useState(false);
    const executeWhatsApp = async () => {
        const content = printRef.current;
        if (!content) return;
        setSharing(true);
        try {
            const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], `CashReceipt.png`, { type: 'image/png' });

            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Cash Receipt', text: `Receipt for ${name || 'Walk-in'}` });
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url; link.download = `CashReceipt.png`; link.click();
                URL.revokeObjectURL(url);
                const ph = (phone || '').replace(/[^0-9]/g, '');
                const msg = encodeURIComponent(`Rasiidka Lacag bixinta — Wadarta: $${total.toFixed(2)}. Mahadsanid — Family Dental Clinic`);
                if (ph) window.open(`https://wa.me/${ph}?text=${msg}`, '_blank');
            }
        } catch (err) { console.error(err); }
        finally { setSharing(false); }
    };

    const handleReset = () => {
        setName(''); setPhone(''); setDiscount(''); setPayMethod('Cash');
        setTreatmentItems([{ treatment_id: '', treatment_name: '', teeth: '' }]);
        setShowReceipt(false); setLastSaved(null); setReprintData(null);
    };

    const handleReprint = (tx) => {
        // Parse services into display items from the saved transaction
        const serviceNames = (tx.services || '').split(',').map(s => s.trim()).filter(Boolean);
        const txSubtotal = parseFloat(tx.subtotal || tx.total || 0);
        const txDiscount = parseFloat(tx.discount || 0);
        const txTotal = parseFloat(tx.total || 0);
        const items = serviceNames.length > 0
            ? serviceNames.map(sName => ({ name: sName, qty: 1, price: txSubtotal / serviceNames.length, lineTotal: txSubtotal / serviceNames.length }))
            : [{ name: 'Service', qty: 1, price: txTotal, lineTotal: txTotal }];
        setReprintData({
            id: tx.id,
            name: tx.name || '',
            phone: tx.phone || '',
            services: items,
            subtotal: txSubtotal,
            discount: txDiscount,
            total: txTotal,
            method: tx.method || 'Cash',
            date: tx.created_at ? new Date(tx.created_at).toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : today,
        });
        setShowReceipt(true);
    };

    const handleDeleteSingle = async (id) => {
        const ok = await showConfirm('Delete Record?', 'This cash transaction will be permanently removed.');
        if (!ok) return;
        try { await deleteCashTransaction(id); showSuccess('Record deleted'); fetchTransactions(); }
        catch (err) { showError(err.message); }
    };

    const inputClass = 'w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500';
    const today = new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });

    const S = {
        page: { width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', padding: '12mm 14mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '12px', color: '#000', lineHeight: 1.5 },
        headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
        headerSide: { width: '30%', fontSize: '11px', paddingTop: '40px' },
        headerCenter: { textAlign: 'center', flex: 1 },
        logo: { width: '55px', height: 'auto', display: 'block', margin: '0 auto 8px' },
        clinicName: { fontSize: '17px', fontWeight: 'bold', margin: '0 0 12px', letterSpacing: '0.5px' },
        contactLine: { fontSize: '11px', margin: '2px 0' },
        receiptTitle: { fontSize: '14px', fontWeight: 'bold', margin: '0 0 3px' },
        divider: { borderTop: '2px solid #000', margin: '0' },
        dividerThin: { borderTop: '1.5px solid #000', margin: '0' },
        th: { fontSize: '11px', fontWeight: 'bold', padding: '6px 4px', borderBottom: '2px solid #000' },
        td: { fontSize: '12px', padding: '8px 4px', verticalAlign: 'top' },
        totalBox: { display: 'flex', justifyContent: 'flex-end', fontWeight: 'bold', fontSize: '13px', borderTop: '1.5px solid #999', paddingTop: '6px', marginTop: '6px' },
        footerWrap: { textAlign: 'center', paddingTop: '20px', marginTop: 'auto' },
        barcode: { height: '35px', width: '150px', margin: '10px auto 0', background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 5px, transparent 5px, transparent 8px, #000 8px, #000 11px, transparent 11px, transparent 13px)' },
    };

    return (
        <>
            <Header title="Cash">
                <button onClick={handleReset} className="px-3 md:px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">refresh</span><span className="hidden md:inline">Clear</span>
                </button>
            </Header>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Form */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Patient Info */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Patient Information</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Name</label>
                                    <input value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Full name" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Phone</label>
                                    <input value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="+252..." />
                                </div>
                            </div>
                        </div>

                        {/* Dental Chart & Treatments */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Treatments & Dental Chart</p>
                            <TreatmentTeethPicker treatments={dbTreatments} items={treatmentItems} onChange={setTreatmentItems} />
                        </div>
                    </div>

                    {/* Right: Summary + Payment */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Payment Summary</p>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Subtotal</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">${subtotal.toFixed(2)}</span>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Discount ($)</label>
                                    <input type="number" step="0.01" min="0" value={discount} onChange={e => setDiscount(e.target.value)} className={inputClass} placeholder="0.00" />
                                </div>
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total</span>
                                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${total.toFixed(2)}</span>
                                </div>
                                <div className="pt-2">
                                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Payment Method</label>
                                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={inputClass}>
                                        <option>Cash</option><option>Zaad</option><option>Edahab</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveAndPrint} disabled={saving}
                            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-60">
                            <span className="material-symbols-outlined text-[18px]">print</span>
                            {saving ? 'Saving...' : 'Save & Print'}
                        </button>
                    </div>
                </div>

                {/* ── Cash Customers ── */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                                Cash Customers
                            </h3>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Click a customer to view their transactions</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
                                <input value={cashSearch} onChange={e => setCashSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 w-48" placeholder="Search customers..." />
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {txLoading ? (
                            <div className="p-12 text-center"><span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span></div>
                        ) : (() => {
                            // Group transactions by customer name
                            const grouped = {};
                            transactions.forEach(tx => {
                                const key = (tx.name || 'Walk-in').trim();
                                if (!grouped[key]) grouped[key] = { name: key, phone: tx.phone || '', transactions: [], totalSpent: 0 };
                                grouped[key].transactions.push(tx);
                                grouped[key].totalSpent += parseFloat(tx.total || 0);
                                if (tx.phone && !grouped[key].phone) grouped[key].phone = tx.phone;
                            });
                            const customerList = Object.values(grouped)
                                .filter(c => !cashSearch || c.name.toLowerCase().includes(cashSearch.toLowerCase()) || c.phone.includes(cashSearch))
                                .sort((a, b) => b.transactions[0]?.id - a.transactions[0]?.id);

                            return customerList.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">No cash customers yet.</div>
                            ) : (
                                <table className="w-full text-left min-w-[500px]">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3 font-semibold">Customer</th>
                                            <th className="px-5 py-3 font-semibold text-center">Visits</th>
                                            <th className="px-5 py-3 font-semibold text-right">Total Spent</th>
                                            <th className="px-5 py-3 font-semibold">Last Visit</th>
                                            <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {customerList.map(c => (
                                            <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                                onClick={() => setViewCustomer(c)}>
                                                <td className="px-5 py-3">
                                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c.name}</p>
                                                    <p className="text-[10px] text-slate-400">{c.phone || 'No phone'}</p>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full text-[11px] font-bold">{c.transactions.length}</span>
                                                </td>
                                                <td className="px-5 py-3 text-sm font-bold text-right text-emerald-600 dark:text-emerald-400">${c.totalSpent.toFixed(2)}</td>
                                                <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(c.transactions[0]?.created_at).toLocaleDateString()}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); setName(c.name); setPhone(c.phone); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                            className="p-1.5 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-md text-slate-400 hover:text-primary transition-colors" title="Add New Treatment">
                                                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                                        </button>
                                                        <button onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const ok = await showConfirm('Delete Customer?', `Delete ${c.name} and all ${c.transactions.length} transaction(s)?`);
                                                                if (!ok) return;
                                                                try {
                                                                    await Promise.all(c.transactions.map(tx => deleteCashTransaction(tx.id)));
                                                                    showSuccess(`${c.name} deleted`);
                                                                    fetchTransactions();
                                                                } catch (err) { showError(err.message); }
                                                            }}
                                                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md text-slate-400 hover:text-rose-500 transition-colors" title="Delete Customer">
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* ── Customer Detail Modal ── */}
            {viewCustomer && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[20px]">person</span>
                                    {viewCustomer.name}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">{viewCustomer.phone || 'No phone'} · {viewCustomer.transactions.length} visit{viewCustomer.transactions.length !== 1 ? 's' : ''} · Total: ${viewCustomer.totalSpent.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setName(viewCustomer.name); setPhone(viewCustomer.phone); setViewCustomer(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-700 transition-colors flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">add</span>New Treatment
                                </button>
                                <button onClick={() => setViewCustomer(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {viewCustomer.transactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{tx.services}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleString()} · {tx.method} · FDC-C{tx.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${parseFloat(tx.total).toFixed(2)}</span>
                                        <button onClick={() => handleReprint(tx)} className="p-1.5 hover:bg-primary/10 rounded-md text-slate-400 hover:text-primary transition-colors" title="Print">
                                            <span className="material-symbols-outlined text-[16px]">print</span>
                                        </button>
                                        <button onClick={async () => { await handleDeleteSingle(tx.id); setViewCustomer(prev => { const updated = { ...prev, transactions: prev.transactions.filter(t => t.id !== tx.id), totalSpent: prev.totalSpent - parseFloat(tx.total) }; return updated.transactions.length === 0 ? null : updated; }); }}
                                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md text-slate-400 hover:text-rose-500 transition-colors" title="Delete">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {showReceipt && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
                                Cash Receipt Preview
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={executeWhatsApp} disabled={sharing}
                                    className="px-4 py-2 bg-[#25D366] text-white rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-[#1da851] transition-colors disabled:opacity-50">
                                    {sharing
                                        ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                        : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    }
                                    {sharing ? 'Sending...' : 'WhatsApp'}
                                </button>
                                <button onClick={executePrint} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-primary-700 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">print</span>Print
                                </button>
                                <button onClick={() => { setShowReceipt(false); if (reprintData) { setReprintData(null); } else { handleReset(); } }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-2 md:p-6 bg-slate-100 dark:bg-slate-950">
                            <div className="flex justify-center min-w-[148mm]">
                                <div ref={printRef} style={{ width: '148mm', height: '210mm', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                                    <div className="receipt-page" style={S.page}>
                                        <div className="receipt-header">
                                            <div style={S.headerRow}>
                                                <div style={S.headerSide}>
                                                    <p><strong>Cashier:</strong> Sysadmin</p>
                                                    <p style={{ marginTop: '3px' }}>Printed: {reprintData ? reprintData.date : today}</p>
                                                </div>
                                                <div style={S.headerCenter}>
                                                    <img src={`${window.location.origin}/logo.png`} style={S.logo} alt="Logo" />
                                                    <h1 style={S.clinicName}>FAMILY DENTAL CLINIC</h1>
                                                    <p style={S.contactLine}>Mobile: +252(63)4066466</p>
                                                    <p style={S.contactLine}>Zaad: 401036 E-dahab: 62091</p>
                                                    <p style={S.contactLine}>familydentalmc@gmail.com</p>
                                                    <p style={S.contactLine}>Hargeisa, Somaliland</p>
                                                </div>
                                                <div style={{ ...S.headerSide, textAlign: 'right' }}>
                                                    <p style={S.receiptTitle}>Receipt</p>
                                                    <p style={{ fontWeight: 'bold', marginTop: '3px' }}>{new Date().toLocaleDateString('en-US')}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="receipt-body" style={{ flex: 1 }}>
                                            {/* Patient Info */}
                                            {((reprintData ? reprintData.name : name) || (reprintData ? reprintData.phone : phone)) && (
                                                <div style={{ marginBottom: '10px', fontSize: '12px' }}>
                                                    {(reprintData ? reprintData.name : name) && <p><strong>Name:</strong> {reprintData ? reprintData.name : name}</p>}
                                                    {(reprintData ? reprintData.phone : phone) && <p><strong>Phone:</strong> {reprintData ? reprintData.phone : phone}</p>}
                                                </div>
                                            )}
                                            <div style={S.divider}></div>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr>
                                                        <th style={{ ...S.th, textAlign: 'left' }}>Service Name</th>
                                                        <th style={{ ...S.th, textAlign: 'center', width: '50px' }}>Qty</th>
                                                        <th style={{ ...S.th, textAlign: 'right', width: '80px' }}>Price</th>
                                                        <th style={{ ...S.th, textAlign: 'right', width: '80px' }}>Ext Price</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(reprintData ? reprintData.services : services).map((item, i) => (
                                                        <tr key={i}>
                                                            <td style={{ ...S.td, textAlign: 'left' }}>{item.name}</td>
                                                            <td style={{ ...S.td, textAlign: 'center' }}>{item.qty}</td>
                                                            <td style={{ ...S.td, textAlign: 'right' }}>${item.price.toFixed(2)}</td>
                                                            <td style={{ ...S.td, textAlign: 'right' }}>${item.lineTotal.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <div style={S.dividerThin}></div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', fontSize: '12px' }}>
                                                <div style={{ width: '40%', paddingTop: '8px' }}>
                                                    <p>{reprintData ? reprintData.method : payMethod}: (${(reprintData ? reprintData.total : total).toFixed(2)})</p>
                                                </div>
                                                <div style={{ width: '60%', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '11px' }}>
                                                        <span style={{ width: '150px', textAlign: 'right', paddingRight: '12px' }}>Subtotal:</span>
                                                        <span style={{ width: '90px', textAlign: 'right' }}>${(reprintData ? reprintData.subtotal : subtotal).toFixed(2)}</span>
                                                    </div>
                                                    {(reprintData ? reprintData.discount : disc) > 0 && (
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '3px', fontSize: '11px', color: '#059669' }}>
                                                            <span style={{ width: '150px', textAlign: 'right', paddingRight: '12px' }}>Discount:</span>
                                                            <span style={{ width: '90px', textAlign: 'right' }}>−${(reprintData ? reprintData.discount : disc).toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div style={S.totalBox}>
                                                        <span style={{ width: '130px', textAlign: 'right', textTransform: 'uppercase' }}>Receipt Total:</span>
                                                        <span style={{ width: '90px', textAlign: 'right' }}>${(reprintData ? reprintData.total : total).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="receipt-footer" style={S.footerWrap}>
                                            <p style={{ fontSize: '13px', marginBottom: '12px' }}>A reason to smile!</p>
                                            <div style={{ display: 'inline-block', fontFamily: 'monospace', letterSpacing: '2px' }}>
                                                <div style={S.barcode}></div>
                                                <p style={{ marginTop: '4px', fontSize: '12px' }}>{reprintData ? `FDC-C${reprintData.id || Date.now().toString().slice(-5)}` : (lastSaved ? `FDC-C${lastSaved.id}` : `FDC-C${Date.now().toString().slice(-5)}`)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
