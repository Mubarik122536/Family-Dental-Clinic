import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Receipt from '../components/Receipt';
import CustomerSelect from '../components/CustomerSelect';
import { getInvoices, createInvoice, deleteInvoice, getCustomers, getTreatments } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/toast';

export default function Billing() {
    const location = useLocation();
    const prefill = location.state?.prefill || null;

    const [invoices, setInvoices] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [treatments, setTreatments] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState(prefill?.customer_id ? String(prefill.customer_id) : '');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState('');
    const [invoiceItems, setInvoiceItems] = useState(prefill?.items || []);
    const [showReceipt, setShowReceipt] = useState(null);
    const [apiError, setApiError] = useState('');
    const [prefillBanner, setPrefillBanner] = useState(!!prefill);

    // Load customers + treatments once on mount
    useEffect(() => {
        getCustomers({ limit: 100, skipStats: true })
            .then(data => setCustomers(Array.isArray(data) ? data : data.rows || []))
            .catch(err => setApiError('Customers fetch failed: ' + err.message));
        getTreatments()
            .then(setTreatments)
            .catch(err => setApiError('Treatments fetch failed: ' + err.message));
    }, []);

    // Load invoices on search change
    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const invData = await getInvoices({ search });
            setInvoices(invData);
        } catch (err) {
            setApiError('Invoices fetch failed: ' + err.message);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchInvoices(); }, [search]);

    const addItem = () => {
        setInvoiceItems([...invoiceItems, { treatment_id: '', description: '', quantity: 1, unit_price: 0 }]);
    };

    const updateItem = (index, field, value) => {
        const items = [...invoiceItems];
        items[index][field] = value;
        if (field === 'treatment_id' && value) {
            const treat = treatments.find(t => t.id === parseInt(value));
            if (treat) {
                items[index].description = treat.name;
                items[index].unit_price = parseFloat(treat.price);
            }
        }
        setInvoiceItems(items);
    };

    const removeItem = (index) => {
        setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    };

    const subtotal = invoiceItems.reduce((s, item) => s + (item.unit_price * item.quantity), 0);
    const total = subtotal;

    const handleCreateInvoice = async () => {
        if (!selectedCustomerId || invoiceItems.length === 0) { showError('Select customer and add items'); return; }
        try {
            await createInvoice({ customer_id: parseInt(selectedCustomerId), items: invoiceItems, due_date: dueDate || null });
            setInvoiceItems([]);
            setSelectedCustomerId('');
            showSuccess('Invoice created successfully!');
            fetchInvoices();
        } catch (err) { showError(err.message); }
    };

    const handleDeleteInvoice = async (id) => {
        const confirmed = await showConfirm('Delete Invoice?', 'The customer balance will be reversed.');
        if (!confirmed) return;
        try {
            await deleteInvoice(id);
            showSuccess('Invoice deleted');
            fetchInvoices();
        } catch (err) { showError(err.message); }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Paid': return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
            case 'Pending': return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400';
            case 'Overdue': return 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400';
            default: return 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400';
        }
    };

    const selectedCustomer = customers.find(c => c.id === parseInt(selectedCustomerId));

    return (
        <>
            <Header title="Billing & Invoices">
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">download</span>Export
                    </button>
                </div>
            </Header>
            {apiError && (
                <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {apiError} — Make sure backend is running on port 5001
                </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 md:space-y-5">
                    <p className="text-sm text-slate-400 dark:text-slate-500 -mt-2">Manage customer accounts, invoices and payment tracking.</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors col-span-2 md:col-span-1">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total Invoices</p>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">{invoices.length}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Pending</p>
                            <h3 className="text-xl font-bold text-orange-600 dark:text-orange-500 mt-1">{invoices.filter(i => i.status === 'Pending').length}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Paid</p>
                            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">{invoices.filter(i => i.status === 'Paid').length}</h3>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="relative flex-1 w-full max-w-sm">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Search customers or invoice ID..." />
                            </div>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center"><span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[700px]">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3 font-semibold">Invoice</th>
                                            <th className="px-5 py-3 font-semibold">Customer</th>
                                            <th className="px-5 py-3 font-semibold">Date</th>
                                            <th className="px-5 py-3 font-semibold">Total</th>
                                            <th className="px-5 py-3 font-semibold">Status</th>
                                            <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {invoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-5 py-4 text-sm font-semibold text-primary dark:text-primary-400">{inv.invoice_number}</td>
                                                <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{inv.customer_name || '-'}</td>
                                                <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(inv.date || inv.created_at).toLocaleDateString()}</td>
                                                <td className="px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">${parseFloat(inv.total).toFixed(2)}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(inv.status)}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${inv.status === 'Paid' ? 'bg-emerald-500' : inv.status === 'Pending' ? 'bg-orange-500' : 'bg-rose-500'}`}></span>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => {
                                                            const cust = customers.find(c => c.id === inv.customer_id);
                                                            setShowReceipt({ customer: cust || { name: inv.customer_name, balance: 0 }, items: [{ name: 'Invoice ' + inv.invoice_number, qty: 1, price: parseFloat(inv.total) }] });
                                                        }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary-400 transition-colors" title="Print Receipt">
                                                            <span className="material-symbols-outlined text-[16px]">print</span>
                                                        </button>
                                                        <button onClick={() => handleDeleteInvoice(inv.id)}
                                                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-colors" title="Delete Invoice">
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {invoices.length === 0 && <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">No invoices yet</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <aside className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 md:p-6 flex flex-col shrink-0 overflow-y-auto transition-colors">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">New Invoice</h3>
                        <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 rounded text-[10px] font-bold uppercase">Draft</span>
                    </div>
                    {prefillBanner && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
                            <span className="material-symbols-outlined text-emerald-600 text-[15px]">dentistry</span>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex-1">Pre-filled from dental chart for <strong>{prefill.customer_name}</strong></p>
                            <button onClick={() => setPrefillBanner(false)} className="text-emerald-400 hover:text-emerald-600">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">Fill in the details to generate invoice.</p>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Select Customer</label>
                            <CustomerSelect
                                value={selectedCustomerId}
                                onChange={(id) => setSelectedCustomerId(id)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Date</label><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                            <div><label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Treatments / Items</label>
                                <button onClick={addItem} className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                                    <span className="material-symbols-outlined text-[14px]">add</span>Add Row
                                </button>
                            </div>
                            <div className="space-y-3">
                                {invoiceItems.map((item, i) => (
                                    <div key={i} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                                        <select value={item.treatment_id} onChange={e => updateItem(i, 'treatment_id', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-200 mb-2">
                                            <option value="">Select treatment...</option>
                                            {treatments.map(t => <option key={t.id} value={t.id}>{t.name} - ${parseFloat(t.price).toFixed(2)}</option>)}
                                        </select>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">QTY:</span>
                                                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-12 px-1 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-center text-slate-800 dark:text-slate-200" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">${(item.unit_price * item.quantity).toFixed(2)}</span>
                                                <button onClick={() => removeItem(i)} className="text-rose-400 hover:text-rose-600"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {invoiceItems.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">Click "Add Row" to add treatments</p>}
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4 space-y-2">
                        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400"><span>Subtotal</span><span className="font-medium">${subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between text-base font-bold text-slate-800 dark:text-slate-100 pt-2 border-t border-slate-100 dark:border-slate-700"><span>Total Amount</span><span>${total.toFixed(2)}</span></div>
                    </div>

                    <div className="mt-5 space-y-2">
                        <button onClick={handleCreateInvoice} className="w-full py-3 bg-primary hover:bg-primary-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">send</span>Generate Invoice
                        </button>
                    </div>
                </aside>
            </div>

            {showReceipt && (
                <Receipt customer={showReceipt.customer} items={showReceipt.items} onClose={() => setShowReceipt(null)} />
            )}
        </>
    );
}

