import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useState, useMemo } from "react";
import { 
    ArrowDownTrayIcon, 
    ChevronRightIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    CalendarIcon
} from "@heroicons/react/24/outline";

export default function SummaryShow({ sr, data }) {
    const [searchPartNumber, setSearchPartNumber] = useState("");
    const [orderTypeFilter, setOrderTypeFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [weekFilter, setWeekFilter] = useState("");

    const handleBack = () => {
        router.get('/summary');
    };

    // Filter data
    const filteredData = useMemo(() => {
        let filtered = [...data];

        // Filter by part number
        if (searchPartNumber) {
            filtered = filtered.filter(item => 
                item.part_number?.toLowerCase().includes(searchPartNumber.toLowerCase())
            );
        }

        // Filter by order type
        if (orderTypeFilter) {
            filtered = filtered.filter(item => 
                (item.order_type || '').toUpperCase() === orderTypeFilter.toUpperCase()
            );
        }

        // Filter by date range (ETD OR ETA)
        if (startDate && endDate) {
            filtered = filtered.filter(item => {
                const etdMatch = item.etd && item.etd >= startDate && item.etd <= endDate;
                const etaMatch = item.eta && item.eta >= startDate && item.eta <= endDate;
                return etdMatch || etaMatch;
            });
        } else if (startDate) {
            filtered = filtered.filter(item => {
                const etdMatch = item.etd && item.etd >= startDate;
                const etaMatch = item.eta && item.eta >= startDate;
                return etdMatch || etaMatch;
            });
        } else if (endDate) {
            filtered = filtered.filter(item => {
                const etdMatch = item.etd && item.etd <= endDate;
                const etaMatch = item.eta && item.eta <= endDate;
                return etdMatch || etaMatch;
            });
        }

        // Filter by Week
        if (weekFilter) {
            filtered = filtered.filter(item => item.week === weekFilter);
        }

        const parseWeekNumber = (week) => {
            if (!week) return 0;
            const match = week.toString().match(/(\d+)/);
            return match ? Number(match[1]) : 0;
        };

        const orderTypeRank = (orderType) => {
            const type = (orderType || '').toUpperCase();
            if (type === 'FIRM') return 0;
            if (type === 'FORECAST') return 1;
            return 2;
        };

        return filtered.sort((a, b) => {
            const productCompare = (a.part_number || '').localeCompare(b.part_number || '', undefined, { numeric: true });
            if (productCompare !== 0) return productCompare;

            const orderTypeCompare = orderTypeRank(a.order_type) - orderTypeRank(b.order_type);
            if (orderTypeCompare !== 0) return orderTypeCompare;

            const weekA = parseWeekNumber(a.week);
            const weekB = parseWeekNumber(b.week);
            if (weekA !== weekB) return weekA - weekB;

            if (a.etd && b.etd) {
                return a.etd.localeCompare(b.etd);
            }

            return 0;
        });
    }, [data, searchPartNumber, orderTypeFilter, startDate, endDate, weekFilter]);

    // Calculate totals
    const totalQty = filteredData.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const totalFirmQty = filteredData
        .filter((item) => (item.order_type || '').toUpperCase() === 'FIRM')
        .reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const totalForecastQty = filteredData
        .filter((item) => (item.order_type || '').toUpperCase() === 'FORECAST')
        .reduce((sum, item) => sum + Number(item.qty || 0), 0);

    const originalTotalItems = data.length;
    const originalTotalQty = data.reduce((sum, item) => sum + Number(item.qty || 0), 0);

    // Reset filters
    const resetFilters = () => {
        setSearchPartNumber("");
        setOrderTypeFilter("");
        setStartDate("");
        setEndDate("");
        setWeekFilter("");
    };

    // Count active filters
    const activeFiltersCount = [
        searchPartNumber, 
        orderTypeFilter, 
        startDate, 
        endDate,
        weekFilter
    ].filter(f => f).length;

    // Get unique values for week dropdown
    const uniqueWeeks = useMemo(() => {
        const weekNumber = (week) => {
            if (!week) return 0;
            const match = week.toString().match(/(\d+)/);
            return match ? Number(match[1]) : 0;
        };

        const weeks = data.map(item => item.week).filter(week => week);
        return [...new Set(weeks)].sort((a, b) => weekNumber(a) - weekNumber(b));
    }, [data]);

    // Format date without year
    const formatDate = (date) => {
        if (!date) return '-';
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return '-';
        const month = parsed.getMonth() + 1;
        const day = parsed.getDate();
        return `${month}/${day}`;
    };

    return (
        <AdminLayout title="Summary Detail">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                    <span>Menu</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span>Shipping Release</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <button onClick={handleBack} className="hover:text-gray-900">Summary</button>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span className="text-gray-900 font-medium">Detail</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <button
                                    onClick={handleBack}
                                    className="text-[#1D6F42] hover:text-green-800 mb-2 inline-flex items-center gap-1 text-sm"
                                >
                                    ← Back to Summary List
                                </button>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Summary Detail - {sr.source_file || sr.sr_number}
                                </h1>
                                <div className="text-sm text-gray-500 mt-1">
                                    Customer: {sr.customer} | Port: {sr.port || '-'} | Month: {sr.month || '-'} | Upload: {new Date(sr.upload_date).toLocaleString()}
                                </div>
                            </div>
                            
                            <a
                                href={`/summary/${sr.id}/export`}
                                className="bg-[#1D6F42] text-white px-4 py-2 rounded-lg hover:bg-green-700 inline-flex items-center gap-2 transition-colors"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Export Excel</span>
                            </a>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Filter Section - One Line with Optimized Widths */}
                        <div className="flex flex-wrap items-end gap-3">
                            {/* Product Number - Smaller width */}
                            <div className="w-56">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Product No.</label>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Product No. or Assy No...."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        value={searchPartNumber}
                                        onChange={(e) => setSearchPartNumber(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Order Type - Fixed width */}
                            <div className="w-28">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={orderTypeFilter}
                                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                                >
                                    <option value="">All</option>
                                    <option value="FIRM">FIRM</option>
                                    <option value="FORECAST">FORECAST</option>
                                </select>
                            </div>

                            {/* Week - Fixed width */}
                            <div className="w-28">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Week</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={weekFilter}
                                    onChange={(e) => setWeekFilter(e.target.value)}
                                >
                                    <option value="">All</option>
                                    {uniqueWeeks.map(week => (
                                        <option key={week} value={week}>{week}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date Range - Larger width */}
                            <div className="flex-1 min-w-[320px]">
                                <label className="block text-xs font-medium text-gray-700 mb-1">ETD / ETA Range</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="date"
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            placeholder="Start"
                                        />
                                    </div>
                                    <span className="text-gray-400 self-center">-</span>
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="date"
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            placeholder="End"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Reset Button */}
                            {activeFiltersCount > 0 && (
                                <button
                                    onClick={resetFilters}
                                    className="h-10 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                                    title="Reset filters"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                    <span className="text-sm">Reset</span>
                                </button>
                            )}
                        </div>

                        {/* Active Filters Badge */}
                        {activeFiltersCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-xs text-gray-500">Active filters:</span>
                                {searchPartNumber && (
                                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                        Product: {searchPartNumber}
                                    </span>
                                )}
                                {orderTypeFilter && (
                                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                        {orderTypeFilter}
                                    </span>
                                )}
                                {weekFilter && (
                                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                        Week: {weekFilter}
                                    </span>
                                )}
                                {(startDate || endDate) && (
                                    <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                        Date: {startDate || '...'} - {endDate || '...'}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="rounded-xl bg-[#f4fbf6] border border-[#d7efdd] p-4">
                                <div className="text-xs uppercase tracking-wide text-[#1D6F42]">Items</div>
                                <div className="text-2xl font-semibold text-gray-900">{filteredData.length}</div>
                                {filteredData.length !== originalTotalItems && (
                                    <div className="text-xs text-gray-400 mt-1">of {originalTotalItems}</div>
                                )}
                            </div>
                            <div className="rounded-xl bg-[#f4fbf6] border border-[#d7efdd] p-4">
                                <div className="text-xs uppercase tracking-wide text-[#1D6F42]">Total Qty</div>
                                <div className="text-2xl font-semibold text-gray-900">{totalQty.toLocaleString()}</div>
                                {totalQty !== originalTotalQty && (
                                    <div className="text-xs text-gray-400 mt-1">of {originalTotalQty.toLocaleString()}</div>
                                )}
                            </div>
                            <div className="rounded-xl bg-[#f4fbf6] border border-[#d7efdd] p-4">
                                <div className="text-xs uppercase tracking-wide text-[#1D6F42]">FIRM</div>
                                <div className="text-2xl font-semibold text-gray-900">{totalFirmQty.toLocaleString()}</div>
                            </div>
                            <div className="rounded-xl bg-[#f4fbf6] border border-[#d7efdd] p-4">
                                <div className="text-xs uppercase tracking-wide text-[#1D6F42]">FORECAST</div>
                                <div className="text-2xl font-semibold text-gray-900">{totalForecastQty.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Detail Table */}
                        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                            {filteredData.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <p>No data found</p>
                                    {activeFiltersCount > 0 && (
                                        <button
                                            onClick={resetFilters}
                                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600">
                                        Showing {filteredData.length} of {data.length} items
                                        {activeFiltersCount > 0 && (
                                            <span className="ml-2 text-green-600">(filtered)</span>
                                        )}
                                    </div>
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">No</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Product No.</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Week</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Order Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ETD</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ETA</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {filteredData.map((item, index) => (
                                                <tr key={index} className="hover:bg-[#f1faf3]">
                                                    <td className="px-4 py-4 text-sm text-gray-600">{index + 1}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-700 font-medium">{item.part_number}</td>
                                                    <td className="px-4 py-4 text-sm">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                            {item.week || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            (item.order_type || '').toUpperCase() === 'FIRM' 
                                                                ? 'bg-blue-100 text-blue-700' 
                                                                : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                            {item.order_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-700">{formatDate(item.etd)}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-700">{formatDate(item.eta)}</td>
                                                    <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">{Number(item.qty || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-medium border-t">
                                            <tr>
                                                <td colSpan="6" className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total:</td>
                                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{totalQty.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}