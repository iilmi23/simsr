import { useState } from 'react';
import { Head } from '@inertiajs/react';
import Sidebar from '@/Components/Admin/Sidebar';
import Topbar from '@/Components/Admin/Topbar';

// Harus sama persis dengan konstanta di Sidebar.jsx
const SIDEBAR_EXPANDED_W  = 240; // px — saat sidebarOpen = true
const SIDEBAR_COLLAPSED_W = 68;  // px — saat sidebarOpen = false

export default function AdminLayout({ title, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const offset = sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;

    return (
        <>
            <Head title={title ? `${title} | SIMSR` : 'SIMSR'} />

            <div className="min-h-screen bg-gray-50 flex">

                {/* Sidebar — fixed, tidak ikut flow */}
                <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                {/* Main Content — diberi margin-left agar tidak tertimpa sidebar */}
                <div
                    className="flex flex-col flex-1 min-w-0"
                    style={{
                        marginLeft: offset,
                        transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    {/* Topbar */}
                    <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto pt-20">
                        {/* pt-16 = 64px, sesuaikan dengan tinggi Topbar */}
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}