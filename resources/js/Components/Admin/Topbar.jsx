import { Link, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import { UserCircleIcon } from "@heroicons/react/24/outline";

export default function Topbar({ sidebarOpen, setSidebarOpen }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef();
    const user = usePage().props.auth.user;
    const roleLabel = {
        admin: 'Admin',
        ppc_staff: 'PPC Staff',
        ppc_supervisor: 'PPC Supervisor',
        ppc_manager: 'PPC Manager',
    }[user?.role] ?? 'User';

    useEffect(() => {
        function handleClick(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-gray-200 shadow-sm z-50">
            <div className="flex items-center justify-between h-full px-5 md:px-6">

                {/* LEFT SECTION */}
                <div className="flex items-center gap-5">

                    {/* Toggle Sidebar (jika ada) */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="md:hidden text-gray-600 hover:text-[#1D6F42]"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* LOGO - ukuran diperbesar & proporsional */}
                    <Link href="/dashboard" className="flex justify-start">
                        <img
                            src="/images/jai.jpg"
                            alt="SIMSR Logo"
                            className="h-11 w-38"  // 
                        />
                    </Link>

                </div>

                {/* RIGHT SECTION */}
                <div className="flex items-center gap-4">

                    {/* PROFILE */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setOpen(!open)}
                            className="flex items-center gap-3 hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-all"
                        >
                            {/* Avatar dengan fallback icon orang */}
                            <div className="relative">
                                <img
                                    src="https://ui-avatars.com/api/?name=Admin&background=1D6F42&color=fff&size=128"
                                    alt="Admin"
                                    className="w-10 h-10 rounded-full border-2 border-gray-200 object-cover"  // ← diperbesar dari w-9 h-9
                                />
                                {/* Fallback icon jika gambar gagal load */}
                                <UserCircleIcon className="absolute inset-0 w-10 h-10 text-[#1D6F42]/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <div className="hidden md:flex flex-col items-start">
                                <span className="text-sm font-semibold text-gray-800">{user?.name ?? 'User'}</span>
                                <span className="text-xs text-gray-500">{roleLabel}</span>
                            </div>

                            <svg
                                className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* DROPDOWN */}
                        {open && (
                            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">

                                {/* Header Dropdown */}
                                <div className="bg-[#1D6F42] text-white p-5">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=1D6F42&color=fff&size=128`}
                                            alt={user?.name ?? 'User'}
                                            className="w-12 h-12 rounded-full border-2 border-white/30"
                                        />
                                        <div>
                                            <p className="font-semibold">{user?.name ?? 'User'}</p>
                                            <p className="text-xs text-green-100 mt-0.5">{user?.email ?? ''}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="p-2">
                                    <Link
                                        href={route('profile.edit')}
                                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-[#1D6F42] transition-colors"
                                    >
                                        <UserCircleIcon className="w-5 h-5" />
                                        <span>Profile</span>
                                    </Link>

                                    <Link
                                        href={route('settings')}
                                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-[#1D6F42] transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span>Settings</span>
                                    </Link>

                                    <div className="border-t border-gray-100 my-2"></div>

                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span>Logout</span>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}