import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { FaArrowLeft, FaEdit, FaUser, FaEnvelope, FaShieldAlt, FaCalendar } from 'react-icons/fa';

export default function Show({ user }) {
    const getRoleBadge = (role) => {
        const badges = {
            admin: 'bg-red-100 text-red-800',
            ppc_staff: 'bg-blue-100 text-blue-800',
            ppc_supervisor: 'bg-yellow-100 text-yellow-800',
            ppc_manager: 'bg-green-100 text-green-800',
        };
        return badges[role] || 'bg-gray-100 text-gray-800';
    };

    const getRoleLabel = (role) => {
        const labels = {
            admin: 'Admin',
            ppc_staff: 'PPC Staff',
            ppc_supervisor: 'PPC Supervisor',
            ppc_manager: 'PPC Manager',
        };
        return labels[role] || role;
    };

    return (
        <AdminLayout title="User Details">
            <Head title="User Details | SIMSR" />

            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href={route('users.index')}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                <FaArrowLeft className="w-5 h-5" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                    User Details
                                </h1>
                                <p className="text-gray-500 mt-1">
                                    View user information and account details
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route('users.edit', user.id)}
                            className="inline-flex items-center gap-2 bg-[#1D6F42] hover:bg-green-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <FaEdit className="w-4 h-4" />
                            Edit User
                        </Link>
                    </div>
                </div>

                {/* User Details Card */}
                <div className="max-w-4xl">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#1D6F42] to-[#22854e] px-8 py-6">
                            <div className="flex items-center gap-6">
                                <img
                                    className="h-20 w-20 rounded-full border-4 border-white/30"
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=ffffff&color=1D6F42&size=128`}
                                    alt={user.name}
                                />
                                <div className="text-white">
                                    <h2 className="text-2xl font-bold">{user.name}</h2>
                                    <p className="text-green-100">{user.email}</p>
                                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-2 ${getRoleBadge(user.role)}`}>
                                        {getRoleLabel(user.role)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Basic Information */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <FaUser className="w-5 h-5 text-[#1D6F42]" />
                                        Basic Information
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">Full Name</label>
                                            <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">Email Address</label>
                                            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">Account Status</label>
                                            <p className="mt-1">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    user.email_verified_at
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {user.email_verified_at ? 'Verified' : 'Unverified'}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Role & Permissions */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <FaShieldAlt className="w-5 h-5 text-[#1D6F42]" />
                                        Role & Permissions
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">Role</label>
                                            <p className="mt-1">
                                                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">Permissions</label>
                                            <div className="mt-1 space-y-1">
                                                {user.role === 'admin' && (
                                                    <div className="text-sm text-gray-900">
                                                        • Full system access<br/>
                                                        • User management<br/>
                                                        • Master data management<br/>
                                                        • System settings<br/>
                                                        • Debug tools
                                                    </div>
                                                )}
                                                {(user.role === 'ppc_staff' || user.role === 'ppc_supervisor' || user.role === 'ppc_manager') && (
                                                    <div className="text-sm text-gray-900">
                                                        • SR upload and management<br/>
                                                        • SPP tracking<br/>
                                                        • Summary reports<br/>
                                                        • History access
                                                    </div>
                                                )}
                                                {user.role === 'ppc_supervisor' && (
                                                    <div className="text-sm text-gray-900 mt-2">
                                                        • Additional approval permissions<br/>
                                                        • Team monitoring
                                                    </div>
                                                )}
                                                {user.role === 'ppc_manager' && (
                                                    <div className="text-sm text-gray-900 mt-2">
                                                        • KPI dashboard access<br/>
                                                        • Final approval authority
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Account Information */}
                            <div className="mt-8 pt-8 border-t border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <FaCalendar className="w-5 h-5 text-[#1D6F42]" />
                                    Account Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500">Account Created</label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {new Date(user.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500">Email Verified</label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            {user.email_verified_at
                                                ? new Date(user.email_verified_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })
                                                : 'Not verified'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}