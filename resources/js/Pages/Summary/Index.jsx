import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useState } from "react";
import { EyeIcon, ArrowDownTrayIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export default function SummaryIndex({ srList, customers, filters }) {
    const [customer, setCustomer] = useState(filters.customer || "");
    const [search, setSearch] = useState(filters.search || "");

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

    return (
        <AdminLayout title="Summary">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
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
                        <div className="flex flex-col lg:flex-row items-end justify-between gap-4">
                            <div className="grid gap-4 w-full lg:grid-cols-[2fr_1fr]">
                                <div>
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search SR</label>
                                    <input
                                        id="search"
                                        name="search"
                                        type="text"
                                        placeholder="Search SR number or source file"
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

                            <div className="flex items-end gap-2">
                                <button
                                    onClick={handleFilter}
                                    className="inline-flex justify-center items-center h-11 px-5 rounded-xl bg-[#1D6F42] text-sm font-medium text-white shadow-sm hover:bg-[#145330] transition-all"
                                >
                                    Filter
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="inline-flex justify-center items-center h-11 px-5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
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
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">SR Number</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Source File</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Items</th>
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
                                                <td className="p-3 font-medium text-gray-900">{sr.sr_number}</td>
                                                <td className="p-3 text-gray-700">{sr.source_file || '-'}</td>
                                                <td className="p-3 text-gray-700">{sr.total_items}</td>
                                                <td className="p-3 text-gray-700">{new Date(sr.upload_date).toLocaleDateString()}</td>
                                                <td className="p-3 flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleView(sr.id)}
                                                        className="inline-flex items-center gap-2 bg-[#1D6F42] text-white px-3 py-1 rounded hover:bg-green-700"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        <span>View</span>
                                                    </button>
                                                    <a
                                                        href={`/summary/${sr.id}/export`}
                                                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                                    >
                                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                                        <span>Export</span>
                                                    </a>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}