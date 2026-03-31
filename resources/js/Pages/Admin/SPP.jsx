import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

export default function SPP({ customers, filters, summary, sppData }) {
    const [customer, setCustomer] = useState(filters.customer || '');

    const handleFilter = () => {
        router.get('/spp', { customer }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        setCustomer('');
        router.get('/spp', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout title="SPP">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 pb-3">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">SPP</h1>
                            <p className="text-sm text-gray-500">Six Month Production Plan dari data SR</p>
                        </div>
                    </div>

                    <div className="px-6 pb-6 border-b border-gray-100 bg-[#F6FEF4]">
                        <div className="grid gap-4 lg:grid-cols-[1.5fr_auto] items-end">
                            <div>
                                <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <select
                                    id="customer"
                                    name="customer"
                                    className="w-full h-11 px-4 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                >
                                    <option value="">Semua Customer</option>
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

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleFilter}
                                    className="inline-flex justify-center items-center h-11 px-5 rounded-xl bg-[#1D6F42] text-sm font-medium text-white shadow-sm hover:bg-[#145330] transition-all"
                                >
                                    Filter
                                </button>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="inline-flex justify-center items-center h-11 px-5 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl border border-[#D7ECDD] bg-[#F2FBF4] p-5 shadow-sm">
                                <p className="text-sm font-medium text-gray-500">Total Records</p>
                                <p className="mt-3 text-3xl font-semibold text-gray-900">{summary.total_records}</p>
                            </div>
                            <div className="rounded-2xl border border-[#D7ECDD] bg-[#F2FBF4] p-5 shadow-sm">
                                <p className="text-sm font-medium text-gray-500">Total Qty</p>
                                <p className="mt-3 text-3xl font-semibold text-gray-900">{summary.total_qty ?? 0}</p>
                            </div>
                            <div className="rounded-2xl border border-[#D7ECDD] bg-[#F2FBF4] p-5 shadow-sm">
                                <p className="text-sm font-medium text-gray-500">Unique Parts</p>
                                <p className="mt-3 text-3xl font-semibold text-gray-900">{summary.unique_parts}</p>
                            </div>
                            <div className="rounded-2xl border border-[#D7ECDD] bg-[#F2FBF4] p-5 shadow-sm">
                                <p className="text-sm font-medium text-gray-500">Periode</p>
                                <p className="mt-3 text-lg font-semibold text-gray-900">{summary.period_range}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">No</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Periode</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Unique Parts</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Total Lines</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sppData.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-6 text-center text-gray-500">Tidak ada data SPP</td>
                                        </tr>
                                    ) : (
                                        sppData.map((row, index) => (
                                            <tr key={row.period} className="border-t hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                                                <td className="px-4 py-3 text-gray-900">{row.label}</td>
                                                <td className="px-4 py-3 text-right text-gray-900">{row.total_qty}</td>
                                                <td className="px-4 py-3 text-right text-gray-900">{row.unique_parts}</td>
                                                <td className="px-4 py-3 text-right text-gray-900">{row.total_lines}</td>
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
