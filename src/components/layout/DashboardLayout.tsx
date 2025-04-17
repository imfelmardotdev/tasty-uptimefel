import React, { useState } from 'react'; // Import useState
import { Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Import Button
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'; // Import Sheet components
import { Menu } from 'lucide-react'; // Import Menu icon
import Sidebar from './Sidebar';

const DashboardLayout = () => {
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Desktop Sidebar */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto hidden lg:block">
                <Sidebar />
            </aside>

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                 {/* Mobile Sidebar (Sheet) - Moved Sheet wrapper here */}
                 <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                    {/* Trigger is now conceptually linked but not structurally nested here */}
                    <SheetContent side="left" className="p-0 w-64"> {/* Remove padding, set width */}
                        <Sidebar />
                    </SheetContent>
                    {/* SheetTrigger is not rendered here directly */}
                 </Sheet>

                {/* Mobile Header */}
                <header className="lg:hidden bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-4 flex-shrink-0">
                     {/* Button now directly controls the state, SheetTrigger wrapper removed */}
                    <Button variant="ghost" size="icon" className="mr-4" onClick={() => setIsMobileSidebarOpen(true)}>
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle sidebar</span>
                    </Button>
                    {/* Optional: Add mobile logo/title here if needed */}
                     <div className="flex items-center space-x-2">
                        <span className="h-3 w-3 bg-green-500 rounded-full"></span>
                        <span className="text-lg font-semibold text-gray-900">{import.meta.env.VITE_APP_NAME || 'Uptime Monitor'}</span>
                    </div>
                </header>

                {/* Main content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6"> {/* Adjusted padding */}
                    {/* Outlet renders the specific dashboard page */}
                    <Outlet />
                </main>

                {/* Optional Footer within main content area if needed later */}
                {/* <footer className="bg-white border-t border-gray-200 p-4"> ... </footer> */}
            </div>
        </div>
    );
};

export default DashboardLayout;
