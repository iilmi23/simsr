import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useState, useEffect } from "react";
import {
    EyeIcon,
    ArrowDownTrayIcon,
    TrashIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";

export default function SummaryIndex({ srList, customers, filters, flash }) {
    const [customer, setCustomer] = useState(filters.customer || "");
    const [search, setSearch] = useState(filters.search || "");
    const [notification, setNotification] = useState({ type: null, message: "" });
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Check for flash notifications from server
    useEffect(() => {
        const message = flash?.success || flash?.warning || flash?.error;
        const type = flash?.success
            ? "success"
            : flash?.warning
            ? "warning"
            : flash?.error
            ? "error"
            : null;

        if (message && type) {
            setNotification({ type, message });
            const timer = setTimeout(() => setNotification({ type: null, message: "" }), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const handleFilter = () => {
        router.get('/summary', { customer, search }, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleReset = () => {
        setCustomer("");
        setSearch("");
        router.get('/summary', {}, {
            preserveState: true,
            preserveScroll: true
        });
    };

    const handleView = (id) => {
        router.get(`/summary/${id}`);
    };

    const handleDelete = (id) => {
        setDeleteTarget(id);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        router.delete(route('summary.destroy', deleteTarget), {
            preserveState: false,
            preserveScroll: true,
            onSuccess: () => {
                setNotification({ type: 'success', message: 'SR upload successfully deleted!' });
                setTimeout(() => {
                    setNotification({ type: null, message: '' });
                }, 3000);
            }
        });

        setDeleteTarget(null);
    };

    const cancelDelete = () => {
        setDeleteTarget(null);
    };

    const closeNotification = () => {
        setNotification({ type: null, message: '' });
    };

    const deleteRecord = deleteTarget ? srList.find((sr) => sr.id === deleteTarget) : null;

    return (
        <AdminLayout title="Summary">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                {/* Notification */}
                {notification.message && (
                    <div className="fixed top-4 right-4 z-50 animate-slide-in">
                        <div className={`flex items-center gap-3 rounded-xl shadow-lg p-4 min-w-[300px] ${
                            notification.type === "success"
                                ? "bg-green-50 border border-green-200 text-green-800"
                                : notification.type === "warning"
                                ? "bg-amber-50 border border-amber-200 text-amber-800"
                                : "bg-red-50 border border-red-200 text-red-800"
                        }`}>
                            <div className="flex-shrink-0">
                                <CheckCircleIcon className={`w-6 h-6 ${
                                    notification.type === "success"
                                        ? "text-green-600"
                                        : notification.type === "warning"
                                        ? "text-amber-600"
                                        : "text-red-600"
                                }`} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{notification.message}</p>
                            </div>
                            <button
                                onClick={() => setNotification({ type: null, message: "" })}
                                className="flex-shrink-0 transition-colors hover:opacity-80"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                    <span>Menu</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span>Shipping Release</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span className="text-gray-900 font-medium">Summary</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 pb-3">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Summary Upload</h1>
                            <p className="text-sm text-gray-500">Total uploads: {srList.length}</p>
                        </div>
                    </div>

                    <div className="px-6 pb-4 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Source File</label>
                                        <input
                                            id="search"
                                            name="search"
                                            type="text"
                                            placeholder="Search source file"
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                        <select
                                            id="customer"
                                            name="customer"
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                            value={customer}
                                            onChange={(e) => setCustomer(e.target.value)}
                                        >
                                            <option value="">All Customer</option>
                                            {customers.map((customerItem) => (
                                                <option
                                                    key={customerItem.code ?? customerItem.name}
                                                    value={customerItem.code ?? customerItem.name}
                                                >
                                                    {customerItem.code ?? customerItem.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleFilter}
                                    className="inline-flex justify-center items-center h-11 px-6 rounded-xl bg-[#1D6F42] text-sm font-medium text-white hover:bg-[#155a36] transition-all shadow-sm"
                                >
                                    Filter
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="inline-flex justify-center items-center h-11 px-6 rounded-xl bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">No</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Port</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Source File</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Sheet</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Total Items</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Upload Date</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {srList.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="p-3 text-center text-gray-500">
                                                No SR data found
                                            </td>
                                        </tr>
                                    ) : (
                                        srList.map((sr, index) => (
                                            <tr key={sr.id} className="border-t hover:bg-gray-50">
                                                <td className="p-3">{index + 1}</td>
                                                <td className="p-3 text-gray-700">{sr.customer}</td>
                                                <td className="p-3 text-gray-700">{sr.port || '-'}</td>
                                                <td className="p-3 font-medium text-gray-900">{sr.source_file || '-'}</td>
                                                <td className="p-3 text-gray-700">{sr.sheet_name || '-'}</td>
                                                <td className="p-3 text-gray-700">{sr.total_items}</td>
                                                <td className="p-3 text-gray-700">{new Date(sr.upload_date).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleView(sr.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 bg-[#1D6F42] text-white rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
                                                            title="View"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </button>
                                                        <a
                                                            href={`/summary/${sr.id}/export`}
                                                            className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                                                            title="Export"
                                                        >
                                                            <ArrowDownTrayIcon className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(sr.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
                                                            title="Delete"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {deleteRecord && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Delete Upload</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Delete upload source file <span className="font-semibold">{deleteRecord.source_file}</span>? Related data will be permanently deleted.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={cancelDelete}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                .animate-slide-in {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>
        </AdminLayout>
    );
}