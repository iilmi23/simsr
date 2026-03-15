import { Link } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

export default function Topbar({ sidebarOpen, setSidebarOpen }) {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef(null);

    // Click outside handler
    useEffect(() => {
        function handleClickOutside(event) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-20">
            <div className="px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center justify-between">
                    {/* Left Section */}
                    <div className="flex items-center space-x-3">
                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden transition-colors duration-200"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Page Title with Greeting */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                Welcome back, <span className="text-[#1D6F42]">Admin</span>
                            </h2>
                            <p className="text-xs text-gray-500">
                                {new Date().toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center space-x-3">
                        {/* User Menu */}
                        <div className="relative" ref={userMenuRef}>
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center space-x-3 p-1.5 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
                            >
                                <div className="relative">
                                    <img
                                        src="https://ui-avatars.com/api/?name=Admin+User&background=1D6F42&color=fff&bold=true&size=256"
                                        alt="Profile"
                                        className="w-9 h-9 rounded-xl ring-2 ring-[#1D6F42]/20 group-hover:ring-[#1D6F42]/40 transition-all"
                                    />
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                </div>
                                
                                <div className="hidden md:block text-left">
                                    <p className="text-sm font-semibold text-gray-800">Admin SIMSR</p>
                                    <p className="text-xs text-gray-500">Administrator</p>
                                </div>
                                
                                <svg 
                                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* User Dropdown */}
                            {showUserMenu && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                                    <div className="bg-gradient-to-r from-[#1D6F42] to-[#166035] p-4">
                                        <p className="text-sm font-medium text-white">Signed in as</p>
                                        <p className="text-sm font-semibold text-white mt-1">Admin SIMSR</p>
                                        <p className="text-xs text-green-100 mt-1">admin@simsr.com</p>
                                    </div>
                                    
                                    <div className="p-2">
                                        <Link
                                            href={route('profile.edit')}
                                            className="flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1D6F42] rounded-lg transition-colors group"
                                        >
                                            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#1D6F42]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span>My Profile</span>
                                        </Link>
                                        
                                        <Link
                                            href={route('settings')}
                                            className="flex items-center space-x-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#1D6F42] rounded-lg transition-colors group"
                                        >
                                            <svg className="w-5 h-5 text-gray-400 group-hover:text-[#1D6F42]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>Settings</span>
                                        </Link>
                                        
                                        <div className="border-t border-gray-100 my-2"></div>
                                        
                                        <Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                            className="flex items-center space-x-3 w-full text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                                        >
                                            <svg className="w-5 h-5 text-red-500 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            <span>Logout</span>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}