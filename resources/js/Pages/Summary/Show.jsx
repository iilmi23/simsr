import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export default function SummaryShow({ sr, data }) {
    const handleBack = () => {
        router.get('/summary');
    };

    const totalQty = data.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const totalFirmQty = data
        .filter((item) => (item.order_type || '').toUpperCase() === 'FIRM')
        .reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const totalForecastQty = data
        .filter((item) => (item.order_type || '').toUpperCase() === 'FORECAST')
        .reduce((sum, item) => sum + Number(item.qty || 0), 0);

    return (
        <AdminLayout title="Summary Detail">
            <div className="p-6 space-y-6">

                {/* HEADER with BACK BUTTON */}
                <div className="flex justify-between items-center">
                    <div>
                        <button
                            onClick={handleBack}
                            className="text-blue-600 hover:text-blue-800 mb-2 inline-flex items-center"
                        >
                            ← Back to Summary List
                        </button>
                        <h1 className="text-2xl font-bold">
                            Summary Detail - {sr.sr_number}
                        </h1>
                        <div className="text-sm text-gray-500 mt-1">
                            Customer: {sr.customer} | Month: {sr.month} | Upload: {new Date(sr.upload_date).toLocaleString()}
                        </div>
                    </div>
                    
                    {/* EXPORT BUTTON */}
                    <a
                        href={`/summary/${sr.id}/export`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>Export Excel</span>
                    </a>
                </div>

                {/* SUMMARY CARD */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow p-4">
                        <div className="text-sm text-gray-500">Total Items</div>
                        <div className="text-2xl font-bold">{data.length}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4">
                        <div className="text-sm text-gray-500">Total Quantity</div>
                        <div className="text-2xl font-bold">{totalQty.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4">
                        <div className="text-sm text-gray-500">FIRM Quantity</div>
                        <div className="text-2xl font-bold">{totalFirmQty.toLocaleString()}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4">
                        <div className="text-sm text-gray-500">FORECAST Quantity</div>
                        <div className="text-2xl font-bold">{totalForecastQty.toLocaleString()}</div>
                    </div>
                </div>

                {/* DETAIL TABLE */}
                <div className="bg-white rounded-xl shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-3 text-left">No</th>
                                <th className="p-3 text-left">Part Number</th>
                                <th className="p-3 text-left">Order Type</th>
                                <th className="p-3 text-left">ETD</th>
                                <th className="p-3 text-left">ETA</th>
                                <th className="p-3 text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-3 text-center text-gray-500">
                                        No data available
                                    </td>
                                </tr>
                            ) : (
                                data.map((item, index) => (
                                    <tr key={index} className="border-t hover:bg-gray-50">
                                        <td className="p-3">{index + 1}</td>
                                        <td className="p-3 font-medium">{item.part_number}</td>
                                        <td className="p-3">{item.order_type}</td>
                                        <td className="p-3">{item.etd}</td>
                                        <td className="p-3">{item.eta}</td>
                                        <td className="p-3 text-right font-bold">{Number(item.qty || 0).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-gray-50 font-medium">
                            <tr>
                                <td colSpan="4" className="p-3 text-right">Total Quantity:</td>
                                <td className="p-3 text-right font-bold">{totalQty.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

            </div>
        </AdminLayout>
    );
}