import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Detect if already installed / running as standalone
        const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        setIsStandalone(isStandaloneMatch);

        // Detect iOS
        const ua = window.navigator.userAgent;
        const webkit = !!ua.match(/WebKit/i);
        const isIOSDevice = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
        setIsIOS(isIOSDevice && webkit && !ua.match(/CriOS/i));

        // Chrome/Android "beforeinstallprompt"
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // On iOS, if not standalone, we can optionally show the iOS banner after a delay
        if (isIOSDevice && !isStandaloneMatch) {
            // Show prompt for iOS since they don't have beforeinstallprompt
            const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
            if (!hasDismissed) {
                setTimeout(() => setShowPrompt(true), 3000); // 3 sec delay
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const dismissPrompt = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (isStandalone || !showPrompt) return null;

    return (
        <div className="fixed top-4 left-4 right-4 z-[90] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/20 p-4 md:max-w-sm md:left-auto md:right-4 flex flex-col gap-3 animate-slide-down">
            <div className="flex items-start gap-4">
                <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-xl object-contain shadow-sm border border-slate-100 dark:border-slate-700" />
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Install Family Dental</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {isIOS 
                            ? "Install this app on your iPhone. Tap the Share icon below and select 'Add to Home Screen'."
                            : "Add this app to your home screen for quick access and offline features."}
                    </p>
                </div>
                <button onClick={dismissPrompt} className="p-1 -mr-2 -mt-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>
            
            {!isIOS && deferredPrompt && (
                <button 
                    onClick={handleInstallClick}
                    className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-700 transition-colors"
                >
                    Install App
                </button>
            )}
        </div>
    );
}
