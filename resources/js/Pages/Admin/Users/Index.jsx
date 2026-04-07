import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';

export default function Index({ users }) {
    const { flash, auth } = usePage().props;

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
        <AdminLayout title="User Management">
            <Head title="User Management | SIMSR" />

            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                                User Management
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Manage system users and their roles
                            </p>
                        </div>
                        <Link
                            href={route('users.create')}
                            className="inline-flex items-center gap-2 bg-[#1D6F42] hover:bg-green-800 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <FaPlus className="w-4 h-4" />
                            Add User
                        </Link>
                    </div>
                </div>

                {/* Flash Messages */}
                {flash.success && (
                    <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                        <p className="text-sm text-green-700">{flash.success}</p>
                    </div>
                )}
                {flash.error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                        <p className="text-sm text-red-700">{flash.error}</p>
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.data.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <img
                                                        className="h-10 w-10 rounded-full"
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1D6F42&color=fff&size=128`}
                                                        alt={user.name}
                                                    />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadge(user.role)}`}>
                                                {getRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                user.email_verified_at
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {user.email_verified_at ? 'Verified' : 'Unverified'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={route('users.show', user.id)}
                                                    className="text-[#1D6F42] hover:text-green-800 p-1"
                                                    title="View"
                                                >
                                                    <FaEye className="w-4 h-4" />
                                                </Link>
                                                <Link
                                                    href={route('users.edit', user.id)}
                                                    className="text-blue-600 hover:text-blue-800 p-1"
                                                    title="Edit"
                                                >
                                                    <FaEdit className="w-4 h-4" />
                                                </Link>
                                                {user.id !== auth.user.id && (
                                                    <Link
                                                        href={route('users.destroy', user.id)}
                                                        method="delete"
                                                        as="button"
                                                        className="text-red-600 hover:text-red-800 p-1"
                                                        title="Delete"
                                                        onClick={(e) => {
                                                            if (!confirm('Are you sure you want to delete this user?')) {
                                                                e.preventDefault();
                                                            }
                                                        }}
                                                    >
                                                        <FaTrash className="w-4 h-4" />
                                                    </Link>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.links && (
                        <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing {users.from} to {users.to} of {users.total} results
                                </div>
                                <div className="flex space-x-1">
                                    {users.links.map((link, index) => (
                                        link.url ? (
                                            <Link
                                                key={index}
                                                href={link.url}
                                                className={`px-3 py-1 text-sm border rounded ${
                                                    link.active
                                                        ? 'bg-[#1D6F42] text-white border-[#1D6F42]'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span
                                                key={index}
                                                className="px-3 py-1 text-sm border rounded bg-gray-100 text-gray-400 border-gray-300"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}