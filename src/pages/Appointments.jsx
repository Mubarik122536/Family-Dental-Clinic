import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { getAppointments, createAppointment, deleteAppointment, getCustomers } from '../services/api';
import { showSuccess, showError, showConfirm } from '../utils/toast';

export default function Appointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    // ── FILTER STATE ──
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [reminderFilter, setReminderFilter] = useState('All');
    const [visitDateFilter, setVisitDateFilter] = useState('All');
    const [nextVisitFilter, setNextVisitFilter] = useState('All');
    const [customVisitFrom, setCustomVisitFrom] = useState('');
    const [customVisitTo, setCustomVisitTo] = useState('');
    const [customNextFrom, setCustomNextFrom] = useState('');
    const [customNextTo, setCustomNextTo] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');

    // Batch entry state
    const [patientIds, setPatientIds] = useState([{ search: '', id: '', name: '' }]);
    const [reminder, setReminder] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Customer search
    const [activeIdx, setActiveIdx] = useState(null);
    const [customerResults, setCustomerResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchTimer = useRef(null);
    const dropdownRef = useRef(null);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const data = await getAppointments();
            setAppointments(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAppointments(); }, []);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Today's date and next month auto-calculated
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
    })();

    // ── DATE RANGE HELPERS ──
    const getDateRange = (preset) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        if (preset === 'Today') return { from: todayStr, to: todayStr };
        if (preset === 'This Week') {
            const day = now.getDay();
            const start = new Date(now); start.setDate(now.getDate() - day);
            const end = new Date(start); end.setDate(start.getDate() + 6);
            return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
        }
        if (preset === 'This Month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { from: start.toISOString().split('T')[0], to: end.toISOString().split('T')[0] };
        }
        return null;
    };

    const inDateRange = (dateStr, preset, customFrom, customTo) => {
        if (preset === 'All') return true;
        if (preset === 'Custom') {
            if (customFrom && dateStr < customFrom) return false;
            if (customTo && dateStr > customTo) return false;
            return true;
        }
        const range = getDateRange(preset);
        if (!range) return true;
        return dateStr >= range.from && dateStr <= range.to;
    };

    // ── FILTERED + SORTED LIST ──
    const filtered = appointments.filter(a => {
        // 1. Search
        if (search) {
            const q = search.toLowerCase();
            const matchName = a.customer_name?.toLowerCase().includes(q);
            const matchPhone = a.customer_phone?.toLowerCase().includes(q);
            const matchId = String(a.customer_id).includes(q);
            if (!matchName && !matchPhone && !matchId) return false;
        }
        // 2. Status
        if (statusFilter !== 'All' && a.status !== statusFilter) return false;
        // 3. Reminder
        if (reminderFilter === 'ON' && !a.reminder) return false;
        if (reminderFilter === 'OFF' && a.reminder) return false;
        // 4. Visit date
        if (!inDateRange(a.visit_date, visitDateFilter, customVisitFrom, customVisitTo)) return false;
        // 5. Next visit
        if (!inDateRange(a.next_visit, nextVisitFilter, customNextFrom, customNextTo)) return false;
        return true;
    }).sort((a, b) => sortOrder === 'newest' ? b.id - a.id : a.id - b.id);

    // ── COUNTS FOR STATS (from full data, not filtered) ──
    const totalCount = appointments.length;
    const todayCount = appointments.filter(a => a.status === 'Today').length;
    const overdueCount = appointments.filter(a => a.status === 'Overdue').length;

    const hasActiveFilters = search || statusFilter !== 'All' || reminderFilter !== 'All' || visitDateFilter !== 'All' || nextVisitFilter !== 'All' || sortOrder !== 'newest';

    const clearAllFilters = () => {
        setSearch(''); setStatusFilter('All'); setReminderFilter('All');
        setVisitDateFilter('All'); setNextVisitFilter('All');
        setCustomVisitFrom(''); setCustomVisitTo('');
        setCustomNextFrom(''); setCustomNextTo('');
        setSortOrder('newest');
    };

    // ── CUSTOMER SEARCH (batch modal) ──
    const handleSearch = (idx, val) => {
        const updated = [...patientIds];
        updated[idx] = { search: val, id: '', name: '' };
        setPatientIds(updated);
        setActiveIdx(idx);

        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (val.length < 1) { setCustomerResults([]); setShowDropdown(false); return; }
        searchTimer.current = setTimeout(async () => {
            try {
                const data = await getCustomers({ search: val, limit: 8, skipStats: true });
                const rows = Array.isArray(data) ? data : (data.rows || []);
                setCustomerResults(rows);
                setShowDropdown(rows.length > 0);
            } catch (_) { setCustomerResults([]); }
        }, 250);
    };

    const selectCustomer = (idx, c) => {
        const updated = [...patientIds];
        updated[idx] = { search: `${c.id} — ${c.name}`, id: c.id, name: c.name };
        setPatientIds(updated);
        setShowDropdown(false);
        setActiveIdx(null);
    };

    const addRow = () => setPatientIds([...patientIds, { search: '', id: '', name: '' }]);
    const removeRow = (idx) => { if (patientIds.length > 1) setPatientIds(patientIds.filter((_, i) => i !== idx)); };
    const resetForm = () => { setPatientIds([{ search: '', id: '', name: '' }]); setReminder(true); setFormError(''); };

    const handleSave = async () => {
        setFormError('');
        const validIds = patientIds.filter(p => p.id);
        if (validIds.length === 0) { setFormError('Add at least one patient'); return; }
        try {
            setSaving(true);
            await Promise.all(validIds.map(p =>
                createAppointment({ customer_id: parseInt(p.id), visit_date: today, next_visit: nextMonth, reminder })
            ));
            showSuccess(`${validIds.length} appointment(s) saved!`);
            setShowAdd(false); resetForm(); fetchAppointments();
        } catch (err) { setFormError(err.message); showError(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm('Delete Appointment?', 'This cannot be undone.');
        if (!confirmed) return;
        try { await deleteAppointment(id); showSuccess('Deleted'); fetchAppointments(); } catch (err) { showError(err.message); }
    };

    const statusBadge = (status) => {
        const styles = {
            'Today': 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
            'Overdue': 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
            'Upcoming': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${styles[status] || styles['Upcoming']}`}>
                {status === 'Today' ? 'TODAY ⚠' : status}
            </span>
        );
    };

    const inputClass = "w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary";
    const selectClass = "px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary";
    const datePresets = ['All', 'Today', 'This Week', 'This Month', 'Custom'];

    return (
        <>
            <Header title="Appointments">
                <button onClick={() => { setShowAdd(true); resetForm(); }} className="px-3 md:px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-[18px]">add</span><span className="hidden md:inline">Daily Check-in</span>
                </button>
            </Header>

            <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-5">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total', value: totalCount, icon: 'calendar_month', color: 'text-primary' },
                        { label: 'Today', value: todayCount, icon: 'today', color: 'text-amber-500' },
                        { label: 'Overdue', value: overdueCount, icon: 'warning', color: 'text-rose-500' }
                    ].map(s => (
                        <div key={s.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center ${s.color}`}>
                                <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── FILTER BAR ── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
                    {/* Row 1: Search + Status + Reminder + Sort */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px] relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400"
                                placeholder="Search by ID, name, or phone..."
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            )}
                        </div>

                        {/* Status Filter */}
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectClass}>
                            <option value="All">All Status</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="Today">Today</option>
                            <option value="Overdue">Overdue</option>
                        </select>

                        {/* Reminder Filter */}
                        <select value={reminderFilter} onChange={e => setReminderFilter(e.target.value)} className={selectClass}>
                            <option value="All">All Reminders</option>
                            <option value="ON">Reminder ON</option>
                            <option value="OFF">Reminder OFF</option>
                        </select>

                        {/* Sort */}
                        <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className={selectClass}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>

                        {/* Clear All */}
                        {hasActiveFilters && (
                            <button onClick={clearAllFilters} className="px-3 py-2 text-xs text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>Clear
                            </button>
                        )}
                    </div>

                    {/* Row 2: Date Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Visit Date */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Visit Date:</span>
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                                {datePresets.map(p => (
                                    <button key={p} onClick={() => setVisitDateFilter(p)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${visitDateFilter === p ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>{p}</button>
                                ))}
                            </div>
                            {visitDateFilter === 'Custom' && (
                                <>
                                    <input type="date" value={customVisitFrom} onChange={e => setCustomVisitFrom(e.target.value)} className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300" />
                                    <span className="text-slate-400 text-xs">to</span>
                                    <input type="date" value={customVisitTo} onChange={e => setCustomVisitTo(e.target.value)} className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300" />
                                </>
                            )}
                        </div>

                        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                        {/* Next Visit */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Next Visit:</span>
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                                {datePresets.map(p => (
                                    <button key={p} onClick={() => setNextVisitFilter(p)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${nextVisitFilter === p ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}>{p}</button>
                                ))}
                            </div>
                            {nextVisitFilter === 'Custom' && (
                                <>
                                    <input type="date" value={customNextFrom} onChange={e => setCustomNextFrom(e.target.value)} className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300" />
                                    <span className="text-slate-400 text-xs">to</span>
                                    <input type="date" value={customNextTo} onChange={e => setCustomNextTo(e.target.value)} className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300" />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Results count */}
                    {hasActiveFilters && (
                        <p className="text-[11px] text-slate-400 font-semibold">Showing {filtered.length} of {totalCount} appointments</p>
                    )}
                </div>

                {/* Appointments Table */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 animate-spin">progress_activity</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Customer ID</th>
                                        <th className="px-5 py-3 font-semibold">Customer</th>
                                        <th className="px-5 py-3 font-semibold">Visit Date</th>
                                        <th className="px-5 py-3 font-semibold">Next Visit</th>
                                        <th className="px-5 py-3 font-semibold text-center">Reminder</th>
                                        <th className="px-5 py-3 font-semibold">Status</th>
                                        <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {filtered.map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-5 py-3 text-sm font-semibold text-primary dark:text-primary-400">#{a.customer_id}</td>
                                            <td className="px-5 py-3">
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{a.customer_name || `#${a.customer_id}`}</p>
                                                {a.customer_phone && <p className="text-[11px] text-slate-400">{a.customer_phone}</p>}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400">{a.visit_date}</td>
                                            <td className="px-5 py-3 text-sm text-slate-500 dark:text-slate-400 font-semibold">{a.next_visit}</td>
                                            <td className="px-5 py-3 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.reminder ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                                    {a.reminder ? 'ON' : 'OFF'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">{statusBadge(a.status)}</td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {a.customer_phone && (
                                                        <a
                                                            href={`https://wa.me/${a.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Assalamu Calaykum, tani waa xasuusin ka timid Family Dental Clinic. Waxaad ballan u leedahay daaweyn ilkaha ${a.next_visit}. Fadlan ha iloobin ballantaada. Mahadsanid.`)}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md text-slate-400 hover:text-emerald-500 transition-colors"
                                                            title="Send WhatsApp Reminder"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">chat</span>
                                                        </a>
                                                    )}
                                                    <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md text-slate-400 hover:text-rose-500 transition-colors" title="Delete">
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && !loading && (
                                        <tr><td colSpan="7" className="px-5 py-12 text-center text-slate-400 text-sm">
                                            {hasActiveFilters ? 'No appointments match your filters.' : 'No appointments yet. Start a daily check-in!'}
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Batch Entry Modal */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">event_available</span>
                                Daily Check-in
                            </h3>
                            <button onClick={() => { setShowAdd(false); resetForm(); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-blue-500 text-[20px]">info</span>
                                <div className="text-xs text-blue-700 dark:text-blue-300">
                                    <p className="font-bold">Visit Date: <span className="text-blue-900 dark:text-blue-200">{today}</span></p>
                                    <p className="font-bold">Next Visit: <span className="text-blue-900 dark:text-blue-200">{nextMonth}</span> (auto +1 month)</p>
                                </div>
                            </div>
                        </div>

                        {formError && (
                            <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg mb-3 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">error</span>{formError}
                            </p>
                        )}

                        <div className="space-y-3 mb-4">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients</p>
                            {patientIds.map((p, idx) => (
                                <div key={idx} className="relative flex items-center gap-2">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                                    <div className="flex-1 relative" ref={activeIdx === idx ? dropdownRef : null}>
                                        <input
                                            value={p.search}
                                            onChange={e => handleSearch(idx, e.target.value)}
                                            onFocus={() => { if (activeIdx === idx && customerResults.length > 0) setShowDropdown(true); }}
                                            className={`${inputClass} ${p.id ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                                            placeholder="Type patient ID or name..."
                                        />
                                        {p.id && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-[14px] material-symbols-outlined">check_circle</span>
                                        )}
                                        {showDropdown && activeIdx === idx && (
                                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                                                {customerResults.map(c => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => selectCustomer(idx, c)}
                                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm flex items-center gap-3 transition-colors"
                                                    >
                                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{c.id}</span>
                                                        <div>
                                                            <p className="font-semibold text-slate-700 dark:text-slate-200">{c.name}</p>
                                                            <p className="text-[11px] text-slate-400">{c.phone}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {patientIds.length > 1 && (
                                        <button onClick={() => removeRow(idx)} className="flex-shrink-0 p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded text-slate-400 hover:text-rose-500 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button onClick={addRow} className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 dark:text-slate-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">add</span> Add Another Patient
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500 text-[20px]">chat</span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">WhatsApp Reminder</p>
                                    <p className="text-[11px] text-slate-400">Notify before next visit</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setReminder(v => !v)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${reminder ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${reminder ? 'left-[26px]' : 'left-0.5'}`}></span>
                            </button>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 mb-4">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-500 dark:text-slate-400">Patients Selected</span>
                                <span className="text-lg font-bold text-primary">{patientIds.filter(p => p.id).length}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => { setShowAdd(false); resetForm(); }} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                {saving ? 'Saving...' : `Save ${patientIds.filter(p => p.id).length} Check-in(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
