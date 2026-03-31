import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useState } from "react";

export default function SPPIndex({ customers, filters, summary, sppData }) {
    const [customer, setCustomer] = useState(filters.customer || "");

    const handleFilter = () => {
        router.get('/spp', { customer }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        setCustomer("");
        router.get('/spp', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleView = (period) => {
        router.get(`/spp/${period}`, { customer });
    };

    return (
        <AdminLayout title="SPP">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 pb-3">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Six Month Production Plan</h1>
                            <p className="text-sm text-gray-500">Period: {summary.period_range}</p>
                        </div>
                    </div>

                    <div className="px-6 pb-6 border-b border-gray-100">
                        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr] items-end">
                            <div>
                                <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <select
                                    id="customer"
                                    name="customer"
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-900 focus:border-[#1D6F42] focus:ring-[#1D6F42]/20"
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                >
                                    <option value="">All Customer</option>
                                    {customers.map((customerItem) => (
                                        <option key={customerItem.code} value={customerItem.code}>
                                            {customerItem.code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end gap-2">
                                <button
                                    onClick={handleFilter}
                                    className="inline-flex justify-center items-center rounded-lg bg-[#1D6F42] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                                >
                                    Filter
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="inline-flex justify-center items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-gray-200 bg-green-50 p-4">
                                <p className="text-sm font-medium text-green-900">Total Records</p>
                                <p className="mt-2 text-3xl font-semibold text-green-950">{summary.total_records}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-green-50 p-4">
                                <p className="text-sm font-medium text-green-900">Total Quantity</p>
                                <p className="mt-2 text-3xl font-semibold text-green-950">{summary.total_qty}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-green-50 p-4">
                                <p className="text-sm font-medium text-green-900">Unique Parts</p>
                                <p className="mt-2 text-3xl font-semibold text-green-950">{summary.unique_parts}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">No</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Period</th>
                                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total Qty</th>
                                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Unique Parts</th>
                                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Lines</th>
                                        <th className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sppData.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-6 text-center text-sm text-gray-500">No SPP data found.</td>
                                        </tr>
                                    ) : (
                                        sppData.map((row, index) => (
                                            <tr key={row.period} className="border-t border-gray-100">
                                                <td className="p-3 text-gray-600">{index + 1}</td>
                                                <td className="p-3 text-gray-900">{row.label}</td>
                                                <td className="p-3 text-right text-gray-900">{row.total_qty}</td>
                                                <td className="p-3 text-right text-gray-900">{row.unique_parts}</td>
                                                <td className="p-3 text-right text-gray-900">{row.total_lines}</td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleView(row.period)}
                                                        className="rounded-lg bg-[#1D6F42] px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                                                    >
                                                        View
                                                    </button>
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
