export default function BrandLogo({ className = '' }) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <span className="text-[10px] text-slate-400 font-semibold tracking-widest whitespace-nowrap">
                POWERED BY
            </span>
            <div className="flex items-center gap-1.5 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300">
                {/* Logo Icon */}
                <div className="relative flex items-end">
                    {/* The main 'P' stem */}
                    <div className="w-2.5 h-6 bg-gradient-to-b from-[#8b5cf6] to-[#a855f7] rounded-sm"></div>
                    {/* The 'P' loop */}
                    <div className="w-3.5 h-4 bg-gradient-to-b from-[#8b5cf6] to-[#a855f7] rounded-r-full absolute top-0 left-2"></div>
                    {/* Inner hole of the 'P' */}
                    <div className="w-1.5 h-1.5 bg-background dark:bg-slate-900 rounded-full absolute top-[5px] left-[6px]"></div>
                    {/* Top right target badge */}
                    <div className="absolute -top-2 -right-3 w-4 h-3 bg-[#1e1b4b] rounded-full flex items-center justify-center shadow shadow-black/20">
                        <span className="material-symbols-outlined text-[10px] text-white">my_location</span>
                    </div>
                </div>
                {/* Text Logo */}
                <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#d946ef] ml-2">
                    PROSAAS
                </span>
            </div>
        </div>
    );
}
