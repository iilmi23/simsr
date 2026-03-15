import { useState } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '@/Components/Admin/Sidebar';
import Topbar from '@/Components/Admin/Topbar';

export default function AdminLayout({ title, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <>
            <Head title={title ? `${title} | SIMSR` : 'SIMSR'} />
            
            <div className="min-h-screen bg-gray-50 flex">
                {/* Sidebar */}
                <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col">
                    {/* Topbar */}
                    <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    
                    {/* Page Content */}
                    <main className="flex-1 overflow-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}