import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function Layout() {
    return (
        <div className="flex min-h-screen bg-background dark:bg-slate-950 transition-colors duration-200">
            {/* Desktop Sidebar (Hidden on Mobile) */}
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            {/* min-w-0 prevents flex boxes from overflowing horizontal space on smaller screens, fixing horizontal scroll bugs */}
            {/* pb-20 adds space at the bottom on mobile to accommodate the MobileNav */}
            <main className="flex-1 flex flex-col min-h-screen min-w-0 pb-20 md:pb-0 md:ml-64">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileNav />
        </div>
    );
}
