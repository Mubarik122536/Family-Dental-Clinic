import { useState, useEffect, useRef } from 'react';
import { getCustomers, getCustomer } from '../services/api';

export default function CustomerSelect({ value, onChange, placeholder = "Search customer by name or phone...", disabled = false }) {
    const [search, setSearch] = useState('');
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const wrapperRef = useRef(null);
    const lastFetchedIdRef = useRef(null);

    // Initial load / value sync: Fetch single customer directly by ID using /api/customers/:id
    useEffect(() => {
        if (value) {
            if (selectedCustomer && String(selectedCustomer.id) === String(value)) {
                return;
            }
            if (lastFetchedIdRef.current === String(value)) {
                return;
            }
            lastFetchedIdRef.current = String(value);
            getCustomer(value)
                .then(cust => {
                    if (cust && !cust.error) {
                        setSelectedCustomer(cust);
                        setSearch(cust.name || '');
                    }
                })
                .catch(err => console.error("Failed to load customer by id", err));
        } else {
            lastFetchedIdRef.current = null;
            setSelectedCustomer(null);
            setSearch('');
        }
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                if (selectedCustomer) setSearch(selectedCustomer.name || '');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedCustomer]);

    // Handle typing and fetching via debouncing (passes skipStats: true to avoid heavy stats computation)
    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        const fetchDebounce = setTimeout(async () => {
            try {
                const data = await getCustomers({ search, limit: 20, skipStats: true });
                setOptions(Array.isArray(data) ? data : data.rows || []);
            } catch (err) {
                console.error("Failed to fetch customers", err);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => clearTimeout(fetchDebounce);
    }, [search, isOpen]);

    const handleSelect = (customer) => {
        lastFetchedIdRef.current = String(customer.id);
        setSelectedCustomer(customer);
        setSearch(customer.name);
        setIsOpen(false);
        onChange(String(customer.id));
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
                <input
                    type="text"
                    value={search}
                    disabled={disabled}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                        if (selectedCustomer) {
                            setSelectedCustomer(null);
                            lastFetchedIdRef.current = null;
                            onChange('');
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                />
            </div>

            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {loading ? (
                        <div className="p-3 text-center text-xs text-slate-400">Loading...</div>
                    ) : options.length > 0 ? (
                        options.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
                                className="w-full text-left px-3 py-2.5 hover:bg-primary/5 dark:hover:bg-primary/10 flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                            >
                                <div>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">{c.name}</span>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">{c.phone}</span>
                                </div>
                                {parseFloat(c.balance) > 0 && <span className="text-[10px] text-orange-500 font-bold bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">Debt: ${parseFloat(c.balance).toFixed(2)}</span>}
                            </button>
                        ))
                    ) : (
                        <div className="p-3 text-center text-xs text-slate-400">No customers found</div>
                    )}
                </div>
            )}
        </div>
    );
}
