import { useState, useEffect } from 'react';
import { getToothRecords, saveToothRecord, deleteToothRecord, getTreatments, createCustomerTreatment } from '../services/api';
import { showSuccess, showError } from '../utils/toast';

// Color by treatment category
const categoryColor = (category) => {
    switch ((category || '').toLowerCase()) {
        case 'endodontics': return '#ef4444';
        case 'surgical': return '#f97316';
        case 'orthodontics': return '#8b5cf6';
        case 'cosmetic': return '#f59e0b';
        case 'general': return '#3b82f6';
        default: return '#14b8a6';
    }
};

const legacyColors = {
    root_canal: '#ef4444', filling: '#3b82f6', extraction: '#f97316',
    braces: '#8b5cf6', crown: '#f59e0b', implant: '#14b8a6',
    cleaning: '#22c55e', missing: '#94a3b8',
};

// Quick treatment palette — the 6 most common procedures
const QUICK_TREATMENTS = [
    { name: 'Filling', icon: 'texture', color: '#3b82f6', category: 'General' },
    { name: 'Extraction', icon: 'remove_circle', color: '#f97316', category: 'Surgical' },
    { name: 'Root Canal', icon: 'cardiology', color: '#ef4444', category: 'Endodontics' },
    { name: 'Cleaning', icon: 'water_drop', color: '#22c55e', category: 'General' },
    { name: 'Crown', icon: 'diamond', color: '#f59e0b', category: 'Cosmetic' },
    { name: 'Implant', icon: 'pin_drop', color: '#14b8a6', category: 'Surgical' },
    { name: 'Missing', icon: 'block', color: '#94a3b8', category: '' },
];

// Improved realistic SVG paths for different tooth types
const molarPath = "M4.5,4 C4.5,4 3,6 3,11 C3,16 4,19 4,19 L3.5,23 C3.5,24 6,24 6.5,23 L8,18 L9.5,23 C10,24 12.5,24 12.5,23 L12,19 C12,19 13,16 13,11 C13,6 11.5,4 11.5,4 C11.5,4 10,2.5 8,2.5 C6,2.5 4.5,4 4.5,4 Z";
const premolarPath = "M5,4 C5,4 3.5,6.5 3.5,12 C3.5,17 4.5,20 4.5,20 L4,24 C4,25 6,25 6.5,24 L7.5,19 L8.5,24 C9,25 11,25 11,24 L10.5,20 C10.5,20 11.5,17 11.5,12 C11.5,6.5 10,4 10,4 C10,4 8.5,2 7.5,2 C6.5,2 5,4 5,4 Z";
const caninePath = "M5.5,5 C5.5,5 4,8 4,13 C4,18 5.5,20 5.5,20 L7,26 C7.5,27 8.5,27 9,26 L10.5,20 C10.5,20 12,18 12,13 C12,8 10.5,5 10.5,5 C10.5,5 9.5,3 8,3 C6.5,3 5.5,5 5.5,5 Z";
const incisorPath = "M5.5,5 C5.5,5 4.5,9 4.5,15 C4.5,21 5,23 5,23 L6.5,27 C7,27.5 9,27.5 9.5,27 L11,23 C11,23 11.5,21 11.5,15 C11.5,9 10.5,5 10.5,5 C10.5,5 9.5,3 8,3 C6.5,3 5.5,5 5.5,5 Z";

function getToothPath(quadrantNum) {
    const num = parseInt(quadrantNum);
    if (num <= 3) return { path: molarPath, w: 16, h: 26, type: 'molar' };
    if (num <= 5) return { path: premolarPath, w: 15, h: 26, type: 'premolar' };
    if (num === 6) return { path: caninePath, w: 16, h: 29, type: 'canine' };
    return { path: incisorPath, w: 16, h: 30, type: 'incisor' };
}

function ToothIcon({ toothId, displayNum, arch, treatmentName, treatmentCategory, treatmentStatus, isSelected, onClick }) {
    const { path, w, h } = getToothPath(displayNum);
    const isMissing = treatmentName?.toLowerCase() === 'missing';
    const isPlanned = treatmentStatus === 'Planned';
    const color = isMissing ? '#94a3b8'
        : treatmentName ? (legacyColors[treatmentName] || categoryColor(treatmentCategory))
            : '#ffffff';
    const isLower = arch === 'lower';
    return (
        <button type="button" onClick={onClick} title={`${toothId}${treatmentName ? ' — ' + treatmentName + (isPlanned ? ' (Planned)' : '') : ''}`}
            className={`flex flex-col items-center gap-0 px-0.5 py-1 rounded-lg transition-all duration-150
                ${isSelected ? 'bg-primary/10 ring-2 ring-primary/40 scale-110' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:scale-105'}`}
            style={{ minWidth: 28 }}>
            {isLower && <span className={`text-[10px] font-bold leading-none mb-1 ${isSelected ? 'text-primary' : 'text-slate-400'}`}>{displayNum}</span>}
            <svg width={w * 1.6} height={h * 1.6} viewBox={`0 0 ${w} ${h}`}
                style={{ transform: isLower ? 'rotate(180deg)' : undefined, filter: isSelected ? 'drop-shadow(0 2px 4px rgba(26,43,95,0.25))' : undefined, transition: 'all 0.15s' }}>
                {isPlanned ? (
                    <path d={path} fill="transparent" opacity={0.9}
                        stroke={color === '#ffffff' ? '#cbd5e1' : color} strokeWidth={1.2} strokeDasharray="2,1.5" />
                ) : (
                    <path d={path} fill={color} opacity={treatmentName ? 0.85 : 1}
                        stroke={isSelected ? '#1a2b5f' : treatmentName ? color : '#cbd5e1'} strokeWidth={isSelected ? 0.8 : 0.5} />
                )}
            </svg>
            {!isLower && <span className={`text-[10px] font-bold leading-none mt-1 ${isSelected ? 'text-primary' : 'text-slate-400'}`}>{displayNum}</span>}
        </button>
    );
}

const upperRight = [8, 7, 6, 5, 4, 3, 2, 1].map(n => ({ id: `UR${n}`, num: n }));
const upperLeft = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ id: `UL${n}`, num: n }));
const lowerRight = [8, 7, 6, 5, 4, 3, 2, 1].map(n => ({ id: `LR${n}`, num: n }));
const lowerLeft = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ id: `LL${n}`, num: n }));

export default function Odontogram({ patient, treatments, onClose, onDataChanged }) {
    const [selected, setSelected] = useState(new Set());
    const [toothData, setToothData] = useState({});
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [dbTreatments, setDbTreatments] = useState([]);
    const [showQuickPicker, setShowQuickPicker] = useState(false);

    useEffect(() => {
        if (!patient?.id) return;
        getToothRecords(patient.id)
            .then(records => {
                const map = {};
                records.forEach(r => {
                    const key = r.tooth_id || r.tooth_number;
                    map[key] = { treatment: r.treatment_type, notes: r.notes, status: r.status || 'Completed' };
                });
                setToothData(map);
            })
            .catch(() => setLoadError('Could not load dental records.'));

        getTreatments()
            .then(data => {
                const list = Array.isArray(data) ? data : (data.rows || []);
                setDbTreatments(list);
            })
            .catch(() => { });
    }, [patient?.id]);

    const getTreatmentMeta = (treatmentName) => {
        if (!treatmentName) return null;
        if (treatmentName === 'Missing' || legacyColors[treatmentName]) return { name: treatmentName, category: '', color: legacyColors[treatmentName] || '#94a3b8' };
        const found = dbTreatments.find(t => t.name === treatmentName);
        return found ? { ...found, color: categoryColor(found.category) } : { name: treatmentName, category: '', color: '#94a3b8' };
    };

    // Toggle tooth selection (multi-select)
    const handleClick = (toothId) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(toothId)) next.delete(toothId);
            else next.add(toothId);
            return next;
        });
        // Auto-show quick picker when teeth are selected
        setShowQuickPicker(true);
    };

    // INSTANT auto-save: pick a treatment → save in background → update chart immediately
    const handleQuickTreatment = async (qt) => {
        if (selected.size === 0) return;
        const teethArr = Array.from(selected);
        setSaving(true);

        try {
            // Find matching DB treatment for price lookup
            const dbMatch = dbTreatments.find(t => t.name.toLowerCase().includes(qt.name.toLowerCase()));
            const price = dbMatch?.price || 0;

            // 1) Save tooth records (visual chart state) — in parallel
            const toothPromises = teethArr.map(toothId =>
                saveToothRecord({
                    customer_id: patient.id,
                    tooth_id: toothId,
                    treatment_type: qt.name,
                    notes: '',
                    status: 'Completed',
                })
            );
            await Promise.all(toothPromises);

            // 2) Save financial treatment record (if price > 0)
            if (price > 0) {
                try {
                    await createCustomerTreatment(patient.id, {
                        treatment_id: dbMatch?.id || null,
                        service_name: qt.name,
                        teeth: teethArr,
                        quantity: teethArr.length,
                        unit_price: price,
                        treatment_date: new Date().toISOString().split('T')[0],
                        notes: `Quick treatment: ${teethArr.join(', ')}`,
                        status: 'Completed',
                    });
                } catch (_) { /* non-critical — chart already saved */ }
            }

            // 3) Update local state instantly (no reload needed)
            setToothData(prev => {
                const next = { ...prev };
                teethArr.forEach(id => {
                    next[id] = { treatment: qt.name, notes: '', status: 'Completed' };
                });
                return next;
            });

            setSelected(new Set());
            setShowQuickPicker(false);
            showSuccess(`${qt.name} applied to ${teethArr.join(', ')}`);

            // Notify parent to silently refresh data
            if (onDataChanged) onDataChanged();
        } catch (err) {
            showError(err.message || 'Failed to save treatment');
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async () => {
        if (selected.size === 0) return;
        setSaving(true);
        try {
            for (const toothId of selected) {
                await deleteToothRecord(patient.id, toothId);
                setToothData(p => { const c = { ...p }; delete c[toothId]; return c; });
            }
            setSelected(new Set());
            setShowQuickPicker(false);
            showSuccess('Tooth record cleared');
            if (onDataChanged) onDataChanged();
        } catch { showError('Failed to remove tooth record.'); }
        finally { setSaving(false); }
    };

    const initials = patient?.name?.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    const selectedArr = Array.from(selected);
    const firstSelected = selectedArr.length === 1 ? selectedArr[0] : null;
    const tData = firstSelected ? toothData[firstSelected] : null;
    const txMeta = tData ? getTreatmentMeta(tData.treatment) : null;
    const completedCount = Object.values(toothData).filter(d => d.treatment && d.treatment !== 'Missing' && d.status === 'Completed').length;
    const plannedCount = Object.values(toothData).filter(d => d.treatment && d.status === 'Planned').length;

    const renderQuadrant = (teeth, arch) => teeth.map(t => {
        const d = toothData[t.id]; const m = d ? getTreatmentMeta(d.treatment) : null;
        return <ToothIcon key={t.id} toothId={t.id} displayNum={t.num} arch={arch} treatmentName={d?.treatment} treatmentCategory={m?.category} treatmentStatus={d?.status} isSelected={selected.has(t.id)} onClick={() => handleClick(t.id)} />;
    });

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-primary to-accent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">{initials}</div>
                        <div>
                            <h2 className="text-base font-bold text-white">{patient?.name}</h2>
                            <p className="text-xs text-white/70">Dental Chart — Click teeth → Pick treatment → Auto-saves</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {saving && (
                            <span className="px-2 py-1 bg-white/10 text-white/80 rounded text-[10px] font-bold border border-white/20 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>Saving...
                            </span>
                        )}
                        {selected.size > 0 && (
                            <span className="px-2 py-1 bg-white/10 text-white/80 rounded text-[10px] font-bold border border-white/20">
                                {selected.size} Selected
                            </span>
                        )}
                        <button type="button" onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-white">close</span>
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    {loadError && (
                        <p className="mb-3 text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">warning</span>{loadError}
                        </p>
                    )}

                    {/* Dental Chart */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                            <div className="flex-1 text-center">← Upper Right (UR 8–1)</div>
                            <div className="w-px mx-2"></div>
                            <div className="flex-1 text-center">Upper Left (UL 1–8) →</div>
                        </div>
                        <div className="flex items-end justify-center">
                            <div className="flex items-end gap-0">{renderQuadrant(upperRight, 'upper')}</div>
                            <div className="w-px bg-slate-300 self-stretch mx-2 border-l-2 border-dashed border-slate-300" />
                            <div className="flex items-end gap-0">{renderQuadrant(upperLeft, 'upper')}</div>
                        </div>
                        <div className="border-t-2 border-dashed border-slate-300 my-2" />
                        <div className="flex items-start justify-center">
                            <div className="flex items-start gap-0">{renderQuadrant(lowerRight, 'lower')}</div>
                            <div className="w-px bg-slate-300 self-stretch mx-2 border-l-2 border-dashed border-slate-300" />
                            <div className="flex items-start gap-0">{renderQuadrant(lowerLeft, 'lower')}</div>
                        </div>
                        <div className="flex text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-2">
                            <div className="flex-1 text-center">← Lower Right (LR 8–1)</div>
                            <div className="w-px mx-2"></div>
                            <div className="flex-1 text-center">Lower Left (LL 1–8) →</div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
                        {[['General', '#3b82f6'], ['Endodontics', '#ef4444'], ['Surgical', '#f97316'], ['Orthodontics', '#8b5cf6'], ['Cosmetic', '#f59e0b'], ['Missing', '#94a3b8']].map(([label, color]) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-300">
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-slate-500"></div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Planned</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-500"></div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Completed</span>
                        </div>
                    </div>
                </div>

                {/* Quick Treatment Picker — appears when teeth are selected */}
                {selected.size > 0 && (
                    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-[16px]">dentistry</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {selectedArr.length === 1 ? (
                                            <>{firstSelected} <span className="ml-2 text-[11px] font-semibold text-slate-400 capitalize">{getToothPath(firstSelected.replace(/[A-Z]/g, '')).type}</span></>
                                        ) : (
                                            <>{selected.size} Teeth: <span className="text-primary font-bold">{selectedArr.join(', ')}</span></>
                                        )}
                                    </p>
                                    {txMeta && selected.size === 1 && (
                                        <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: txMeta.color }}>
                                            {txMeta.name}
                                            {tData?.status === 'Completed' && <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded text-[9px] font-bold uppercase">Done</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-slate-500 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700">
                                    Clear
                                </button>
                                {tData && (
                                    <button type="button" onClick={handleRemove} disabled={saving} className="text-xs text-rose-500 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50">
                                        <span className="material-symbols-outlined text-[14px]">delete</span>Remove
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Treatment Grid */}
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Apply Treatment</p>
                        <div className="grid grid-cols-7 gap-2">
                            {QUICK_TREATMENTS.map(qt => (
                                <button
                                    key={qt.name}
                                    type="button"
                                    onClick={() => handleQuickTreatment(qt)}
                                    disabled={saving}
                                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group disabled:opacity-50"
                                >
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: qt.color + '15' }}>
                                        <span className="material-symbols-outlined text-[20px]" style={{ color: qt.color }}>{qt.icon}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-primary">{qt.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Tooth History (single selection) */}
                        {selected.size === 1 && (
                            <div className="mt-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Tooth History</p>
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                        {(treatments || []).filter(t => t.teeth && t.teeth.includes(firstSelected)).length} Records
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-36 overflow-y-auto w-full">
                                    {(treatments || []).filter(t => t.teeth && t.teeth.includes(firstSelected)).length === 0 ? (
                                        <p className="p-3 text-xs text-center text-slate-400 italic">No history for this tooth.</p>
                                    ) : (
                                        (treatments || []).filter(t => t.teeth && t.teeth.includes(firstSelected)).map(tx => (
                                            <div key={tx.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold" style={{ color: getTreatmentMeta(tx.service_name)?.color || '#3b82f6' }}>
                                                        {tx.service_name}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(tx.treatment_date).toLocaleDateString()}</span>
                                                </div>
                                                {tx.notes && <p className="text-[10px] text-slate-400 mt-0.5">{tx.notes}</p>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
