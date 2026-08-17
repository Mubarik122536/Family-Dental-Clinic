import { useState } from 'react';

/**
 * Compact interactive dental chart for selecting teeth in forms.
 * Props: value (comma-separated string), onChange (receives comma-separated string)
 */

const quadrants = [
    { label: 'UR', teeth: [8, 7, 6, 5, 4, 3, 2, 1] },
    { label: 'UL', teeth: [1, 2, 3, 4, 5, 6, 7, 8] },
    { label: 'LR', teeth: [8, 7, 6, 5, 4, 3, 2, 1] },
    { label: 'LL', teeth: [1, 2, 3, 4, 5, 6, 7, 8] },
];

export default function ToothPicker({ value = '', onChange }) {
    const [open, setOpen] = useState(false);

    // Parse selected teeth from comma-separated string
    const selectedSet = new Set(
        (value || '').split(',').map(s => s.trim()).filter(Boolean)
    );

    const toggle = (toothId) => {
        const next = new Set(selectedSet);
        if (next.has(toothId)) next.delete(toothId);
        else next.add(toothId);
        onChange(Array.from(next).join(', '));
    };

    const clearAll = () => onChange('');

    const selectedArr = Array.from(selectedSet);

    return (
        <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Teeth (Dental Chart)</label>

            {/* Selected badges + toggle button */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full text-left px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all flex items-center justify-between gap-2 min-h-[42px]"
            >
                <div className="flex flex-wrap gap-1 flex-1">
                    {selectedArr.length > 0 ? selectedArr.map(t => (
                        <span key={t} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">{t}</span>
                    )) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm">Click to select teeth...</span>
                    )}
                </div>
                <span className="material-symbols-outlined text-slate-400 text-[16px] shrink-0">
                    {open ? 'expand_less' : 'dentistry'}
                </span>
            </button>

            {/* Inline dental chart */}
            {open && (
                <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg">
                    {/* Upper jaw */}
                    <div className="flex items-center justify-center gap-0.5 mb-1">
                        <span className="text-[8px] font-bold text-slate-400 w-6 text-right mr-1">UR</span>
                        {quadrants[0].teeth.map(n => {
                            const id = `UR${n}`;
                            const sel = selectedSet.has(id);
                            return (
                                <button key={id} type="button" onClick={() => toggle(id)}
                                    className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all border ${sel
                                        ? 'bg-primary text-white border-primary shadow-sm scale-105'
                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-primary hover:text-primary'
                                        }`}>
                                    {n}
                                </button>
                            );
                        })}
                        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
                        {quadrants[1].teeth.map(n => {
                            const id = `UL${n}`;
                            const sel = selectedSet.has(id);
                            return (
                                <button key={id} type="button" onClick={() => toggle(id)}
                                    className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all border ${sel
                                        ? 'bg-primary text-white border-primary shadow-sm scale-105'
                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-primary hover:text-primary'
                                        }`}>
                                    {n}
                                </button>
                            );
                        })}
                        <span className="text-[8px] font-bold text-slate-400 w-6 ml-1">UL</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-slate-300 dark:border-slate-600 my-1.5" />

                    {/* Lower jaw */}
                    <div className="flex items-center justify-center gap-0.5">
                        <span className="text-[8px] font-bold text-slate-400 w-6 text-right mr-1">LR</span>
                        {quadrants[2].teeth.map(n => {
                            const id = `LR${n}`;
                            const sel = selectedSet.has(id);
                            return (
                                <button key={id} type="button" onClick={() => toggle(id)}
                                    className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all border ${sel
                                        ? 'bg-primary text-white border-primary shadow-sm scale-105'
                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-primary hover:text-primary'
                                        }`}>
                                    {n}
                                </button>
                            );
                        })}
                        <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
                        {quadrants[3].teeth.map(n => {
                            const id = `LL${n}`;
                            const sel = selectedSet.has(id);
                            return (
                                <button key={id} type="button" onClick={() => toggle(id)}
                                    className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all border ${sel
                                        ? 'bg-primary text-white border-primary shadow-sm scale-105'
                                        : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-primary hover:text-primary'
                                        }`}>
                                    {n}
                                </button>
                            );
                        })}
                        <span className="text-[8px] font-bold text-slate-400 w-6 ml-1">LL</span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400 font-semibold">{selectedArr.length} teeth selected</span>
                        <div className="flex gap-2">
                            {selectedArr.length > 0 && (
                                <button type="button" onClick={clearAll} className="text-[10px] text-rose-500 font-bold hover:underline">Clear</button>
                            )}
                            <button type="button" onClick={() => setOpen(false)} className="text-[10px] text-primary font-bold hover:underline">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
