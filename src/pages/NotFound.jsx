import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center px-6 transition-colors">
            <div className="max-w-md w-full text-center">
                <div className="relative mb-8">
                    <h1 className="text-9xl font-black text-slate-100 dark:text-slate-800 tracking-tighter select-none">404</h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-7xl text-primary animate-bounce">
                            error
                        </span>
                    </div>
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
                    Page not found
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        to="/"
                        className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">home</span>
                        Back to Dashboard
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full sm:w-auto px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        Go Back
                    </button>
                </div>
                
                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                    <BrandLogo />
                </div>
            </div>
        </div>
    );
}
