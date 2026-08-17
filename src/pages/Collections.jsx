import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { showError } from '../utils/toast';

const api = async (url) => {
    const token = localStorage.getItem('dental_token');
    const res = await fetch(`/api${url}`, {
        headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
    });
    if (!res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            const data = await res.json();
            throw new Error(data.error || 'Request failed');
        }
        throw new Error(`Server error (${res.status})`);
    }
    return res.json();
};

const FILTERS = [
    { label: '30 Days', value: 30 },
    { label: '60 Days', value: 60 },
    { label: '90 Days', value: 90 },
    { label: '120+ Days', value: 120 },
];

export default function Collections() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(90);

    const fetchCollections = async () => {
        try {
            setLoading(true);
            const rows = await api(`/collections?days=${filter}`);
            setData(Array.isArray(rows) ? rows : []);
        } catch (err) { console.error(err); showError(err.message); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCollections(); }, [filter]);

    const totalOwed = data.reduce((s, r) => s + (parseFloat(r.total_amount) || 0), 0);

    return (
        <>
            <Header title="Collections" />

            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <span className="material-symbols-outlined text-[22px]">account_balance</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{data.length}</p>
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Overdue Accounts</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <span className="material-symbols-outlined text-[22px]">payments</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">${totalOwed.toFixed(2)}</p>
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total Owed</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-4 col-span-2 md:col-span-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[22px]">filter_alt</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{filter}+</p>
                            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Days Filter</p>
                        </div>
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter by age:</span>
                    {FILTERS.map(f => (
                        <button
                            key={f.value}
                            onClick={() => setFilter(f.value)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === f.value
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Customer</th>
                                        <th className="px-5 py-3 font-semibold">Service</th>
                                        <th className="px-5 py-3 font-semibold text-right">Amount Owed</th>
                                        <th className="px-5 py-3 font-semibold text-center">Days Passed</th>
                                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {data.map(r => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{r.customer_name}</p>
                                                <p className="text-[11px] text-slate-400">{r.customer_phone}</p>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{r.service_name || '—'}</td>
                                            <td className="px-5 py-3 text-sm text-right font-bold text-rose-600 dark:text-rose-400">${parseFloat(r.total_amount).toFixed(2)}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${r.days_passed >= 120 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' :
                                                    r.days_passed >= 90 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                                                        'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                                                    }`}>
                                                    {r.days_passed} days
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {r.customer_phone && (
                                                        <>
                                                            <a
                                                                href={`https://wa.me/${r.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Assalamu Calaykum ${r.customer_name || ''}, tani waa xasuusin ka timid Family Dental Clinic. Waxaan kugu leenahay lacag dhan $${parseFloat(r.total_amount).toFixed(2)}. Fadlan nala soo xiriir si aad u bixiso. Mahadsanid.`)}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md text-slate-400 hover:text-emerald-500 transition-colors"
                                                                title="WhatsApp"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">chat</span>
                                                            </a>
                                                            <a
                                                                href={`tel:${r.customer_phone}`}
                                                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md text-slate-400 hover:text-blue-500 transition-colors"
                                                                title="Call"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px]">call</span>
                                                            </a>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {data.length === 0 && !loading && (
                                        <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-400 text-sm">
                                            No overdue accounts found for {filter}+ days. 🎉
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
