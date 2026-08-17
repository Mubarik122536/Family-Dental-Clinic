import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, bulkUploadCustomers } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/toast';

const colors = ['bg-primary text-white', 'bg-accent text-white', 'bg-amber-500 text-white', 'bg-emerald-500 text-white', 'bg-purple-500 text-white', 'bg-rose-500 text-white', 'bg-blue-500 text-white'];
const PER_PAGE = 50;

function getInitials(name) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function Customers() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [globalStats, setGlobalStats] = useState({ totalDebt: 0, withBalanceCount: 0 });
    const [statusFilter, setStatusFilter] = useState('All');
    const [balanceFilter, setBalanceFilter] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [newCustomer, setNewCustomer] = useState({ id: '', name: '', phone: '', notes: '' });
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const [editCustomer, setEditCustomer] = useState(null);
    const [editError, setEditError] = useState('');

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const data = await getCustomers({
                search, page, limit: PER_PAGE,
                status: statusFilter !== 'All' ? statusFilter : '',
                balance: balanceFilter || '',
            });
            if (Array.isArray(data)) {
                setCustomers(data);
                setTotal(data.length);
                setTotalPages(1);
            } else {
                setCustomers(data.rows || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
                setGlobalStats({
                    totalDebt: data.globalTotalDebt || 0,
                    withBalanceCount: data.globalWithBalanceCount || 0
                });
            }
        } catch (err) {
            console.error('Failed to fetch customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const [prevFilters, setPrevFilters] = useState({ search: '', statusFilter: 'All', balanceFilter: '' });

    useEffect(() => {
        if (search !== prevFilters.search || statusFilter !== prevFilters.statusFilter || balanceFilter !== prevFilters.balanceFilter) {
            setPrevFilters({ search, statusFilter, balanceFilter });
            if (page !== 1) {
                setPage(1);
                return;
            }
        }
        const timer = setTimeout(() => fetchCustomers(), 250);
        return () => clearTimeout(timer);
    }, [search, page, statusFilter, balanceFilter]);

    const handleAddCustomer = async () => {
        try {
            setError('');
            if (!newCustomer.id || !newCustomer.name || !newCustomer.phone) { setError('ID, name and phone are required'); return; }
            await createCustomer(newCustomer);
            setShowAddModal(false);
            setNewCustomer({ id: '', name: '', phone: '', notes: '' });
            showSuccess('Customer added successfully!');
            fetchCustomers();
        } catch (err) { setError(err.message); showError(err.message); }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        const confirmed = await showConfirm('Delete Customer?', 'This action cannot be undone.');
        if (!confirmed) return;
        try { await deleteCustomer(id); showSuccess('Customer deleted'); fetchCustomers(); } catch (err) { showError(err.message); }
    };

    const handleEditSave = async () => {
        try {
            setEditError('');
            if (!editCustomer.name || !editCustomer.phone) { setEditError('Name and phone are required'); return; }
            await updateCustomer(editCustomer.id, editCustomer);
            setEditCustomer(null);
            showSuccess('Customer updated successfully!');
            fetchCustomers();
        } catch (err) { setEditError(err.message); showError(err.message); }
    };

    const handleCSVUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const result = await bulkUploadCustomers(formData);
            setUploadResult(result);
            fetchCustomers();
        } catch (err) {
            setUploadResult({ added: 0, skipped: 0, total: 0, errors: [err.message] });
        }
        e.target.value = '';
    };

    const startIdx = (page - 1) * PER_PAGE + 1;
    const endIdx = Math.min(page * PER_PAGE, total);

    return (
        <>
            <Header title="Braces">
                <div className="flex items-center gap-2 md:gap-3">
                    <button onClick={() => setShowUploadModal(true)} className="px-3 md:px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">upload_file</span>
                        <span className="hidden md:inline">Bulk Upload</span>
                    </button>
                    <button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary-700 text-white px-3 md:px-5 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 transition-all">
                        <span className="material-symbols-outlined text-[18px]">person_add</span>
                        <span className="hidden md:inline">Add Customer</span>
                    </button>
                </div>
            </Header>
            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-4">
                {/* Stats bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Total Braces</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Showing</p>
                        <p className="text-2xl font-bold text-primary dark:text-primary-400 mt-1">{customers.length}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{startIdx}–{endIdx} of {total.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">With Balance</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1">{globalStats.withBalanceCount.toLocaleString()}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm transition-colors">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Total Clinic Debt</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-500 mt-1">${globalStats.totalDebt.toFixed(2)}</p>
                    </div>
                </div>

                {/* Search + Filters */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1 w-full max-w-md relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                placeholder="Search by ID or phone (digits) or name (letters)..."
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto flex-wrap">
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 overflow-x-auto">
                                {['All', 'Active', 'Inactive'].map(s => (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${statusFilter === s ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 overflow-x-auto">
                                {[{ label: 'All', value: '' }, { label: 'With Balance', value: 'with_balance' }, { label: 'Paid', value: 'paid' }].map(f => (
                                    <button key={f.value} onClick={() => setBalanceFilter(f.value)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${balanceFilter === f.value ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800'}`}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            {(search || statusFilter !== 'All' || balanceFilter) && (
                                <button onClick={() => { setSearch(''); setStatusFilter('All'); setBalanceFilter(''); }}
                                    className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors flex shrink-0 items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="p-12 text-center"><span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span><p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Loading customers...</p></div>
                        ) : (
                            <div className="min-w-[800px]">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-400 text-[11px] uppercase tracking-wider transition-colors">
                                        <tr>
                                            <th className="px-5 py-3 font-semibold">Name</th>
                                            <th className="px-5 py-3 font-semibold">Phone</th>
                                            <th className="px-5 py-3 font-semibold text-right">Balance</th>
                                            <th className="px-5 py-3 font-semibold">Status</th>
                                            <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {/* Grouped sections when searching */}
                                        {search.trim() && (() => {
                                            const q = search.trim();
                                            const isNumeric = /^\d+$/.test(q);
                                            const idMatches = customers.filter(c => c.match_type === 'id');
                                            const phoneMatches = customers.filter(c => c.match_type === 'phone');
                                            const nameMatches = customers.filter(c => c.match_type === 'name');
                                            const sections = [];

                                            const highlightText = (text, query, field) => {
                                                if (!text) return '—';
                                                const str = String(text);
                                                if (field === 'id' && isNumeric && str === q) {
                                                    return <span className="bg-amber-200 dark:bg-amber-500/30 px-1 rounded font-bold">{str}</span>;
                                                }
                                                if (field === 'phone' && isNumeric && str === q) {
                                                    return <span className="bg-blue-200 dark:bg-blue-500/30 px-1 rounded font-bold">{str}</span>;
                                                }
                                                if (field === 'name' && !isNumeric) {
                                                    const idx = str.toLowerCase().indexOf(q.toLowerCase());
                                                    if (idx >= 0) {
                                                        return <>{str.slice(0, idx)}<span className="bg-emerald-200 dark:bg-emerald-500/30 px-0.5 rounded font-bold">{str.slice(idx, idx + q.length)}</span>{str.slice(idx + q.length)}</>;
                                                    }
                                                }
                                                return str;
                                            };

                                            const renderRow = (c, field) => (
                                                <tr key={`${field}-${c.id}`} onClick={() => navigate(`/customers/${c.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full ${colors[c.id % colors.length]} flex items-center justify-center font-bold text-[10px]`}>{getInitials(c.name)}</div>
                                                            <div>
                                                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{highlightText(c.name, q, 'name')}</span>
                                                                <p className="text-[10px] text-slate-400">ID: {highlightText(c.id, q, 'id')}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{highlightText(c.phone, q, 'phone')}</td>
                                                    <td className="px-5 py-3 text-right">
                                                        <span className={`text-sm font-bold ${parseFloat(c.balance) > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'}`}>${parseFloat(c.balance).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'}`}>{c.status?.toUpperCase()}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-0.5">
                                                            <button onClick={(e) => { e.stopPropagation(); setEditCustomer({ ...c }); setEditError(''); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-md text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" title="Edit Customer">
                                                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                                            </button>
                                                            <button onClick={(e) => handleDelete(c.id, e)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors" title="Delete">
                                                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );

                                            if (idMatches.length > 0) {
                                                sections.push(
                                                    <tr key="id-header"><td colSpan="5" className="px-5 py-2 bg-amber-50 dark:bg-amber-500/10">
                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">badge</span>
                                                            ID Matches ({idMatches.length})
                                                        </span>
                                                    </td></tr>
                                                );
                                                idMatches.forEach(c => sections.push(renderRow(c, 'id')));
                                            }
                                            if (phoneMatches.length > 0) {
                                                sections.push(
                                                    <tr key="phone-header"><td colSpan="5" className="px-5 py-2 bg-blue-50 dark:bg-blue-500/10">
                                                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">phone</span>
                                                            Phone Matches ({phoneMatches.length})
                                                        </span>
                                                    </td></tr>
                                                );
                                                phoneMatches.forEach(c => sections.push(renderRow(c, 'phone')));
                                            }
                                            if (nameMatches.length > 0) {
                                                sections.push(
                                                    <tr key="name-header"><td colSpan="5" className="px-5 py-2 bg-emerald-50 dark:bg-emerald-500/10">
                                                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">person</span>
                                                            Name Matches ({nameMatches.length})
                                                        </span>
                                                    </td></tr>
                                                );
                                                nameMatches.forEach(c => sections.push(renderRow(c, 'name')));
                                            }
                                            return sections.length > 0 ? sections : null;
                                        })()}

                                        {/* Regular list (no search) */}
                                        {!search.trim() && customers.map((c) => (
                                            <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full ${colors[c.id % colors.length]} flex items-center justify-center font-bold text-[10px]`}>{getInitials(c.name)}</div>
                                                        <div>
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c.name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{c.phone}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <span className={`text-sm font-bold ${parseFloat(c.balance) > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'}`}>${parseFloat(c.balance).toFixed(2)}</span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'}`}>{c.status?.toUpperCase()}</span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditCustomer({ ...c }); setEditError(''); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-md text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors" title="Edit Customer">
                                                            <span className="material-symbols-outlined text-[16px]">edit</span>
                                                        </button>
                                                        <button onClick={(e) => handleDelete(c.id, e)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors" title="Delete">
                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {customers.length === 0 && !loading && (
                                            <tr><td colSpan="5" className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                                                {search || statusFilter !== 'All'
                                                    ? <><span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 block mb-2">search_off</span>No results found for "{search}"</>
                                                    : 'No customers found. Add your first customer!'}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-xs text-slate-400">
                                    Showing <strong className="text-slate-600 dark:text-slate-300">{startIdx}–{endIdx}</strong> of <strong className="text-slate-600 dark:text-slate-300">{total.toLocaleString()}</strong> customers
                                </p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPage(1)} disabled={page === 1}
                                        className="px-2 py-1.5 rounded-md text-xs font-bold text-slate-400 hover:bg-white dark:bg-slate-900 hover:text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <span className="material-symbols-outlined text-[16px]">first_page</span>
                                    </button>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                        className="px-2 py-1.5 rounded-md text-xs font-bold text-slate-400 hover:bg-white dark:bg-slate-900 hover:text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                    </button>
                                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                        let p;
                                        if (totalPages <= 7) p = i + 1;
                                        else if (page <= 4) p = i + 1;
                                        else if (page >= totalPages - 3) p = totalPages - 6 + i;
                                        else p = page - 3 + i;
                                        return (
                                            <button key={p} onClick={() => setPage(p)}
                                                className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${page === p ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:bg-white dark:bg-slate-900 hover:text-slate-600 dark:text-slate-300'}`}>
                                                {p}
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                        className="px-2 py-1.5 rounded-md text-xs font-bold text-slate-400 hover:bg-white dark:bg-slate-900 hover:text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                    </button>
                                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                                        className="px-2 py-1.5 rounded-md text-xs font-bold text-slate-400 hover:bg-white dark:bg-slate-900 hover:text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                        <span className="material-symbols-outlined text-[16px]">last_page</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Customer Modal */}
            {editCustomer && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary dark:text-primary-400">edit_square</span>
                                Edit Customer
                            </h3>
                            <button onClick={() => setEditCustomer(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-4">
                            {editError && <p className="text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">error</span>{editError}</p>}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Basic Info</h4>
                                <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Name *</label><input value={editCustomer.name} onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone *</label><input value={editCustomer.phone} onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>
                                </div>
                                <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Status</label>
                                    <select value={editCustomer.status || 'Active'} onChange={e => setEditCustomer({ ...editCustomer, status: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary">
                                        <option>Active</option><option>Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Other Details</h4>
                                <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes</label><textarea value={editCustomer.notes || ''} onChange={e => setEditCustomer({ ...editCustomer, notes: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary" rows={2} /></div>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
                            <button onClick={() => setEditCustomer(null)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleEditSave} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Customer Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary dark:text-primary-400">person_add</span>
                                Add Customer
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-4">
                            {error && <p className="text-sm font-medium text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">error</span>{error}</p>}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Basic Info</h4>
                                <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">ID *</label><input value={newCustomer.id} onChange={e => setNewCustomer({ ...newCustomer, id: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Enter Customer ID" /></div>
                                <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Name *</label><input value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Full name" /></div>
                                <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone *</label><input value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="+252..." /></div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-3 border border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Additional Details</h4>
                                <div><label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Medical Notes / Conditions</label><textarea value={newCustomer.notes} onChange={e => setNewCustomer({ ...newCustomer, notes: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Any allergies or previous conditions..." rows={2} /></div>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3 shrink-0 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleAddCustomer} className="flex-1 py-2.5 bg-primary hover:bg-primary-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">Save Customer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary dark:text-primary-400">upload_file</span>
                                Bulk Upload Braces
                            </h3>
                            <button onClick={() => { setShowUploadModal(false); setUploadResult(null); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">Upload a CSV file with these column headers:</p>
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-3 font-mono text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">id,name,phone,notes</div>
                        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center hover:border-primary dark:hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all cursor-pointer group">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 group-hover:text-primary dark:group-hover:text-primary-400 transition-colors">cloud_upload</span>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2 group-hover:text-primary transition-colors">Click to upload CSV file</p>
                        </button>
                        {uploadResult && (
                            <div className="mt-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Upload Results</h4>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div className="text-center"><p className="text-lg font-bold text-emerald-600 dark:text-emerald-500">{uploadResult.added}</p><p className="text-[10px] text-slate-400 dark:text-slate-500">Added</p></div>
                                    <div className="text-center"><p className="text-lg font-bold text-orange-600 dark:text-orange-500">{uploadResult.skipped}</p><p className="text-[10px] text-slate-400 dark:text-slate-500">Skipped</p></div>
                                    <div className="text-center"><p className="text-lg font-bold text-slate-600 dark:text-slate-300">{uploadResult.total}</p><p className="text-[10px] text-slate-400 dark:text-slate-500">Total</p></div>
                                </div>
                                {uploadResult.errors?.length > 0 && <div className="max-h-20 overflow-y-auto custom-scrollbar pr-2">{uploadResult.errors.map((err, i) => <p key={i} className="text-[11px] text-rose-500 dark:text-rose-400">{err}</p>)}</div>}
                            </div>
                        )}
                        <div className="mt-6 flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <a href="data:text/csv;charset=utf-8,id,name,phone,notes%0A1001,John Doe,+252634000001,New customer" download="customers_template.csv" className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-center transition-colors">Template</a>
                            <button onClick={() => { setShowUploadModal(false); setUploadResult(null); }} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
