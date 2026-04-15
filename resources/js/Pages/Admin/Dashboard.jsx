import AdminLayout from '@/Layouts/AdminLayout';
import { FaUsers, FaAnchor, FaCheckCircle } from 'react-icons/fa';
import { Link, usePage } from '@inertiajs/react';

export default function Dashboard({ stats, recent_customers, recent_sr, error }) {
    const user = usePage().props.auth.user;
    const roleName = {
        admin: 'Admin',
        staff: 'PPC Staff',
        ppc_staff: 'PPC Staff',
        ppc_supervisor: 'PPC Supervisor',
        ppc_manager: 'PPC Manager',
    }[user?.role] ?? 'User';
    // Stats data dari database - hanya 3 card
    const statsData = [
        {
            title: "Total Customers",
            value: stats?.total_customers || 0,
            icon: <FaUsers />,
            color: "border-orange-400",
            bgLight: "bg-orange-50",
            textColor: "text-orange-600",
            link: "/customers",
            description: "Total registered customers"
        },
        {
            title: "Total Ports",
            value: stats?.total_ports || 0,
            icon: <FaAnchor />,
            color: "border-blue-400",
            bgLight: "bg-blue-50",
            textColor: "text-blue-600",
            link: "/ports",
            description: "Total ports across all customers"
        },
        {
            title: "Total SR",
            value: stats?.total_sr || 0,
            icon: <FaCheckCircle />,
            color: "border-emerald-600",
            bgLight: "bg-emerald-50",
            textColor: "text-emerald-600",
            link: "/sr/upload",
            description: "Total shipping releases"
        },
    ];

    return (
        <AdminLayout title="Dashboard">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Welcome back, {roleName}! Here's an overview of your data.
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Stats Grid - 3 card dengan layout yang lebih baik */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statsData.map((stat, index) => (
                        <Link
                            key={index}
                            href={stat.link}
                            className="group relative bg-white border-l-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                            style={{ 
                                borderLeftColor: stat.color === 'border-orange-400' ? '#FB923C' : 
                                               stat.color === 'border-blue-400' ? '#60A5FA' : '#10B981' 
                            }}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                            {stat.title}
                                        </p>
                                        <h2 className="text-3xl font-bold text-gray-800 mt-2">
                                            {stat.value.toLocaleString()}
                                        </h2>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {stat.description}
                                        </p>
                                    </div>
                                    <div className={`text-4xl ${stat.textColor} opacity-70 group-hover:opacity-100 transition-opacity`}>
                                        {stat.icon}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Hover Effect Border Bottom */}
                            <div 
                                className="absolute bottom-0 left-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                                style={{ 
                                    width: '100%',
                                    backgroundColor: stat.color === 'border-orange-400' ? '#FB923C' : 
                                                   stat.color === 'border-blue-400' ? '#60A5FA' : '#10B981'
                                }}
                            />
                        </Link>
                    ))}
                </div>

                {/* Recent Activity Section */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Customers */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Recent Customers</h2>
                            <p className="text-sm text-gray-500 mt-1">Latest added customers</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {recent_customers && recent_customers.length > 0 ? (
                                recent_customers.map((customer) => (
                                    <div key={customer.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">{customer.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {customer.code || 'No code'} • Created {new Date(customer.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Link
                                                href={`/customers/${customer.id}/ports`}
                                                className="text-sm text-[#1D6F42] hover:underline"
                                            >
                                                Manage Ports
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-gray-500">
                                    <FaUsers className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                    <p>No recent customers data</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent SR */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Recent SR</h2>
                            <p className="text-sm text-gray-500 mt-1">Latest shipping releases</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {recent_sr && recent_sr.length > 0 ? (
                                recent_sr.map((sr) => (
                                    <div key={sr.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {sr.source_file || `SR-${sr.id}`}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    Created {new Date(sr.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Link
                                                href={`/summary/${sr.id}`}
                                                className="text-sm text-[#1D6F42] hover:underline"
                                            >
                                                View Details
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 text-center text-gray-500">
                                    <FaCheckCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                    <p>No recent SR data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                            <p className="text-sm text-gray-500 mt-1">Common tasks and shortcuts</p>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Link
                                href="/customers/create"
                                className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FaUsers className="text-[#1D6F42]" />
                                <div>
                                    <p className="font-medium text-gray-900">Add Customer</p>
                                    <p className="text-xs text-gray-500">Create new customer</p>
                                </div>
                            </Link>
                            <Link
                                href="/sr/upload"
                                className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FaCheckCircle className="text-[#1D6F42]" />
                                <div>
                                    <p className="font-medium text-gray-900">Upload SR</p>
                                    <p className="text-xs text-gray-500">Upload shipping release</p>
                                </div>
                            </Link>
                            <Link
                                href="/ports"
                                className="flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FaAnchor className="text-[#1D6F42]" />
                                <div>
                                    <p className="font-medium text-gray-900">Manage Ports</p>
                                    <p className="text-xs text-gray-500">View all ports</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}