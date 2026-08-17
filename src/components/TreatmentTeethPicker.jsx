import { useState } from 'react';
import ToothPicker from './ToothPicker';

/**
 * Multi-treatment picker with dynamic pricing.
 * Per-tooth treatments auto-calculate from selected teeth on the dental chart.
 * Props:
 *   treatments: array of { id, name, price, category, pricing_type }
 *   items: array of { treatment_id, treatment_name, teeth }
 *   onChange: receives updated items array
 */
export default function TreatmentTeethPicker({ treatments = [], items = [], onChange }) {
    const addItem = () => {
        onChange([...items, { treatment_id: '', treatment_name: '', teeth: '' }]);
    };

    const updateItem = (index, field, value) => {
        const next = items.map((item, i) => {
            if (i !== index) return item;
            if (field === 'treatment_id') {
                const t = treatments.find(tr => String(tr.id) === String(value));
                return { ...item, treatment_id: value, treatment_name: t?.name || '' };
            }
            return { ...item, [field]: value };
        });
        onChange(next);
    };

    const removeItem = (index) => {
        onChange(items.filter((_, i) => i !== index));
    };

    // Count teeth from the comma-separated teeth string
    const countTeeth = (teethStr) => {
        if (!teethStr || !teethStr.trim()) return 0;
        return teethStr.split(',').map(s => s.trim()).filter(Boolean).length;
    };

    const inputClass = "w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary";

    return (
        <div className="space-y-3">
            {items.map((item, idx) => {
                const selectedTreatment = treatments.find(tr => String(tr.id) === String(item.treatment_id));
                const isFixed = selectedTreatment?.pricing_type === 'fixed';
                const unitPrice = selectedTreatment ? parseFloat(selectedTreatment.price) : 0;
                const teethCount = countTeeth(item.teeth);
                const lineTotal = isFixed ? unitPrice : unitPrice * (teethCount || 1);

                return (
                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2.5 relative group">
                        {/* Treatment number badge */}
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                                Treatment {idx + 1}
                            </span>
                            {items.length > 1 && (
                                <button type="button" onClick={() => removeItem(idx)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded text-rose-400 hover:text-rose-500 transition-all"
                                    title="Remove this treatment">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            )}
                        </div>

                        {/* Treatment select */}
                        <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Service</label>
                            <select value={item.treatment_id} onChange={e => updateItem(idx, 'treatment_id', e.target.value)} className={inputClass}>
                                <option value="">Select treatment...</option>
                                {treatments.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} — ${parseFloat(t.price).toFixed(2)} {t.pricing_type === 'fixed' ? '(Fixed)' : '(Per Tooth)'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Teeth picker */}
                        <ToothPicker value={item.teeth} onChange={(teeth) => updateItem(idx, 'teeth', teeth)} />

                        {/* Pricing info — auto-calculated */}
                        {selectedTreatment && isFixed && (
                            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-100 dark:border-amber-500/20">
                                <span className="material-symbols-outlined text-amber-500 text-[16px]">lock</span>
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Fixed Price: ${unitPrice.toFixed(2)}</span>
                            </div>
                        )}

                        {selectedTreatment && !isFixed && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-100 dark:border-blue-500/20">
                                <span className="material-symbols-outlined text-blue-500 text-[16px]">calculate</span>
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                    {teethCount > 0
                                        ? <>${unitPrice.toFixed(2)} × {teethCount} {teethCount === 1 ? 'tooth' : 'teeth'} = <strong>${lineTotal.toFixed(2)}</strong></>
                                        : <>Select teeth on the chart above — ${unitPrice.toFixed(2)}/tooth</>
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Add another treatment button */}
            <button type="button" onClick={addItem}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-400 hover:text-primary hover:border-primary dark:hover:text-primary dark:hover:border-primary transition-all flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add {items.length === 0 ? 'Treatment' : 'Another Treatment'}
            </button>
        </div>
    );
}
