import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';

export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
    const { url } = usePage();
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [openSubmenu, setOpenSubmenu] = useState(null);

    // Menu items untuk SIMSR dengan desain modern
    const menuItems = [
        {
            name: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            route: 'dashboard',
        },
        {
            name: 'Masters',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            submenu: [
                { name: 'Customer', route: 'masters.customer' },
                { name: 'Ports', route: 'masters.ports' },
                { name: 'Car Line', route: 'masters.carline' },
            ]
        },
        {
            name: 'Shipping Release',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
            ),
            route: 'upload-sr',
        },
        {
            name: 'Summary',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            route: 'summary',
            badge: '5',
            badgeColor: 'bg-blue-500'
        },
        {
            name: 'SPP',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            route: 'spp',
            badge: '3',
            badgeColor: 'bg-orange-500'
        },
        {
            name: 'History',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            route: 'history',
        },
        {
            name: 'Settings',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            route: 'settings'
        }
    ];

    // Set active menu based on current route
    useEffect(() => {
        const currentPath = url;

        // Cek di menu utama
        for (const item of menuItems) {
            if (item.route && currentPath.includes(item.route)) {
                setActiveMenu(item.name);
                break;
            }

            // Cek di submenu
            if (item.submenu) {
                for (const sub of item.submenu) {
                    if (currentPath.includes(sub.route)) {
                        setActiveMenu(item.name);
                        setOpenSubmenu(item.name);
                        break;
                    }
                }
            }
        }
    }, [url]);

    const toggleSubmenu = (menuName) => {
        setOpenSubmenu(openSubmenu === menuName ? null : menuName);
    };

    return (
        <>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Light Mode Only */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col bg-white transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-72 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'
                    }`}
                style={{
                    boxShadow: '0 0 20px rgba(0,0,0,0.05)',
                }}
            >
                {/* Logo Area dengan Gambar */}
                <div className={`h-20 flex items-center border-b border-gray-100 ${sidebarOpen ? 'px-6' : 'px-5'}`}>
                    {sidebarOpen ? (
                        <Link href={route('dashboard')} className="flex items-center">
                            {/* Logo Gambar untuk SIMSR */}
                            <img
                                src="/images/logo.png"
                                alt="SIMSR Logo"
                                className="h-35 w-auto object-contain"
                            />
                            {/* <span className="font-bold text-xl text-gray-800">SIM<span className="text-[#1D6F42]">SR</span></span> */}
                        </Link>
                    ) : (
                        <Link href={route('dashboard')} className="flex items-center justify-start w-full">
                            {/* Logo kecil untuk collapsed state */}
                            <img
                                src="/images/logo-icon.png"
                                alt="SIMSR"
                                className="h-8 w-8 object-contain"
                            />
                        </Link>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-6 px-4">
                    {/* Main Menu Section */}
                    <div className="mb-6">
                        {sidebarOpen && (
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                                MENU
                            </p>
                        )}
                        <ul className="space-y-1">
                            {/* Dashboard */}
                            <li>
                                <Link
                                    href={route('dashboard')}
                                    className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeMenu === 'Dashboard'
                                            ? 'bg-[#1D6F42] text-white shadow-md shadow-[#1D6F42]/30'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className={`${activeMenu === 'Dashboard'
                                            ? 'text-white'
                                            : 'text-gray-400 group-hover:text-[#1D6F42]'
                                        }`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                    </span>
                                    {sidebarOpen && <span className="text-sm font-medium ml-3">Dashboard</span>}
                                </Link>
                            </li>

                            {/* Masters dengan Submenu */}
                            <li>
                                <button
                                    onClick={() => toggleSubmenu('Masters')}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${activeMenu === 'Masters'
                                            ? 'bg-[#1D6F42] text-white shadow-md shadow-[#1D6F42]/30'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <span className={`${activeMenu === 'Masters'
                                                ? 'text-white'
                                                : 'text-gray-400'
                                            }`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </span>
                                        {sidebarOpen && <span className="text-sm font-medium ml-3">Masters</span>}
                                    </div>
                                    {sidebarOpen && (
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${openSubmenu === 'Masters' ? 'rotate-180' : ''
                                                } ${activeMenu === 'Masters' ? 'text-white' : 'text-gray-400'
                                                }`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    )}
                                </button>

                                {/* Submenu Masters */}
                                {sidebarOpen && openSubmenu === 'Masters' && (
                                    <ul className="mt-1 ml-11 space-y-1">
                                        {menuItems.find(item => item.name === 'Masters').submenu.map((sub) => (
                                            <li key={sub.name}>
                                                <Link
                                                    href={route(sub.route)}
                                                    className={`block px-3 py-2 text-sm rounded-lg transition-colors ${url.includes(sub.route)
                                                            ? 'text-[#1D6F42] bg-[#1D6F42]/5 font-medium'
                                                            : 'text-gray-600 hover:text-[#1D6F42] hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {sub.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        </ul>
                    </div>

                    {/* Shipping Release Section */}
                    <div className="mb-6">
                        {sidebarOpen && (
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                                SHIPPING RELEASE
                            </p>
                        )}
                        <ul className="space-y-1">
                            {/* Upload SR */}
                            <li>
                                <Link
                                    href={route('upload-sr')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeMenu === 'Upload SR'
                                            ? 'bg-[#1D6F42] text-white shadow-md shadow-[#1D6F42]/30'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <span className={`${activeMenu === 'Upload SR'
                                                ? 'text-white'
                                                : 'text-gray-400 group-hover:text-[#1D6F42]'
                                            }`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                            </svg>
                                        </span>
                                        {sidebarOpen && <span className="text-sm font-medium ml-3">Upload SR</span>}
                                    </div>
                                </Link>
                            </li>

                            {/* Summary */}
                            <li>
                                <Link
                                    href={route('summary')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeMenu === 'Summary'
                                            ? 'bg-[#1D6F42] text-white shadow-md shadow-[#1D6F42]/30'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <span className={`${activeMenu === 'Summary'
                                                ? 'text-white'
                                                : 'text-gray-400 group-hover:text-[#1D6F42]'
                                            }`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </span>
                                        {sidebarOpen && <span className="text-sm font-medium ml-3">Summary</span>}
                                    </div>
                                </Link>
                            </li>

                            {/* SPP */}
                            <li>
                                <Link
                                    href={route('spp')}
                                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeMenu === 'SPP'
                                            ? 'bg-[#1D6F42] text-white shadow-md shadow-[#1D6F42]/30'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <span className={`${activeMenu === 'SPP'
                                                ? 'text-white'
                                                : 'text-gray-400 group-hover:text-[#1D6F42]'
                                            }`}>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </span>
                                        {sidebarOpen && <span className="text-sm font-medium ml-3">SPP</span>}
                                    </div>
                                </Link>
                            </li>

                            {/* History */}
                            <li>
                                <Link
                                    href={route('history')}
                                    className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeMenu === 'History'
                                            ? 'bg-[#1D6F42] text-white shadow-md shadow-[#1D6F42]/30'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className={`${activeMenu === 'History'
                                            ? 'text-white'
                                            : 'text-gray-400 group-hover:text-[#1D6F42]'
                                        }`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                    {sidebarOpen && <span className="text-sm font-medium ml-3">History</span>}
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* System Section */}
                    <div>
                        {sidebarOpen && (
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                                SYSTEM
                            </p>
                        )}
                        <ul className="space-y-1">
                            {/* Settings */}
                            <li>
                                <Link
                                    href={route('settings')}
                                    className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${activeMenu === 'Settings'
                                            ? 'bg-[#1D6F42] text-white shadow-md shadow-[#1D6F42]/30'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className={`${activeMenu === 'Settings'
                                            ? 'text-white'
                                            : 'text-gray-400 group-hover:text-[#1D6F42]'
                                        }`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </span>
                                    {sidebarOpen && <span className="text-sm font-medium ml-3">Settings</span>}
                                </Link>
                            </li>
                        </ul>
                    </div>
                </nav>
            </aside>
        </>
    );
}