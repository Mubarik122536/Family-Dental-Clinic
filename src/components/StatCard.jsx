export default function StatCard({ icon, iconBg, iconColor, label, value, trend, trendUp = true }) {
    return (
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${iconBg}`}>
                    <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
                </div>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {trend}
                    <span className="material-symbols-outlined text-sm">{trendUp ? 'trending_up' : 'trending_down'}</span>
                </span>
            </div>
            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">{label}</p>
            <h3 className="text-2xl font-bold mt-0.5 tracking-tight text-slate-800 dark:text-slate-100 dark:text-slate-100">{value}</h3>
        </div>
    );
}
