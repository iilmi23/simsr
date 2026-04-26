import AdminLayout from "@/Layouts/AdminLayout";
import { Link, router, usePage } from "@inertiajs/react";
import { useEffect, useState, useMemo } from "react";
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    ChevronRightIcon,
    FunnelIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ChevronUpDownIcon,
    DocumentArrowUpIcon,
    CalendarIcon,
    ClockIcon
} from "@heroicons/react/24/outline";

export default function TimeChartIndex({ customers, timeCharts, flash, filters, year, month, monthName, needsUpload, latestBatch }) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(month || new Date().getMonth() + 1);
    
    // Multi-step upload states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadStep, setUploadStep] = useState(1); // 1: Customer, 2: File+Sheet, 3: Preview, 4: Confirm
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [sheetIndex, setSheetIndex] = useState(0);
    const [availableSheets, setAvailableSheets] = useState([]);
    const [previewData, setPreviewData] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Handle flash messages
    useEffect(() => {
        const successMsg = flash?.success || flash?.message || flash?.flash?.success;
        const errorMsg = flash?.error || flash?.flash?.error;

        if (successMsg) {
            setSuccessMessage(successMsg);
            setShowSuccess(true);
            const timer = setTimeout(() => {
                setShowSuccess(false);
                setSuccessMessage("");
            }, 3000);
            return () => clearTimeout(timer);
        }
        
        if (errorMsg) {
            setErrorMessage(errorMsg);
            setShowError(true);
            const timer = setTimeout(() => {
                setShowError(false);
                setErrorMessage("");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    // Handle year/month change
    useEffect(() => {
        if (selectedYear !== year || selectedMonth !== month) {
            router.get(
                route("timechart.index"),
                { year: selectedYear, month: selectedMonth },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ["timeCharts", "year", "month", "monthName", "needsUpload", "latestBatch"],
                }
            );
        }
    }, [selectedYear, selectedMonth]);

    // Handle file selection dan preview
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedFile(file);
        setSheetIndex(0);
        setPreviewData(null);
        setAvailableSheets([]);
    };

    // Load preview data
    const handleLoadPreview = async () => {
        if (!selectedFile || !selectedCustomerId) {
            setErrorMessage("Pilih file dan customer terlebih dahulu");
            setShowError(true);
            return;
        }

        setIsLoadingPreview(true);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('sheet', sheetIndex);
            formData.append('year', selectedYear);
            formData.append('month', selectedMonth);
            formData.append('customer_id', selectedCustomerId);

            const response = await fetch('/timechart/preview', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
            });

            const result = await response.json();

            if (result.success) {
                setAvailableSheets(result.sheets);
                setPreviewData(result.preview);
                setUploadStep(3); // Move to preview step
            } else {
                setErrorMessage(result.error || 'Gagal membaca preview');
                setShowError(true);
                
                // If sheets available, show them
                if (result.sheets) {
                    setAvailableSheets(result.sheets);
                }
            }
        } catch (error) {
            setErrorMessage('Error: ' + error.message);
            setShowError(true);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    // Final upload
    const handleConfirmUpload = async () => {
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('sheet', sheetIndex);
            formData.append('year', selectedYear);
            formData.append('month', selectedMonth);
            formData.append('customer_id', selectedCustomerId);

            const response = await fetch('/timechart/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
            });

            const result = await response.json();

            if (result.success) {
                setSuccessMessage(result.message);
                setShowSuccess(true);
                resetUploadModal();
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                setErrorMessage(result.error || 'Gagal upload');
                setShowError(true);
                setIsUploading(false);
            }
        } catch (error) {
            setErrorMessage('Error: ' + error.message);
            setShowError(true);
            setIsUploading(false);
        }
    };

    // Reset upload modal
    const resetUploadModal = () => {
        setShowUploadModal(false);
        setUploadStep(1);
        setSelectedCustomerId("");
        setSelectedFile(null);
        setSheetIndex(0);
        setAvailableSheets([]);
        setPreviewData(null);
    };

    // Close upload modal
    const closeUploadModal = () => {
        resetUploadModal();
    };

    // Filter timeCharts berdasarkan search
    const filteredTimeCharts = useMemo(() => {
        if (!timeCharts) return [];
        if (!searchTerm) return timeCharts;
        
        return timeCharts.filter(week =>
            week.week_number?.toString().includes(searchTerm) ||
            week.source_file?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [timeCharts, searchTerm]);

    const years = [2024, 2025, 2026, 2027];
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        name: new Date(2024, i, 1).toLocaleString('default', { month: 'long' })
    }));

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <Link href="/dashboard" className="text-gray-600 hover:text-[#1D6F42] transition-colors">
                        Home
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 font-medium">Time Chart</span>
                </div>

                {/* Success Alert */}
                {showSuccess && successMessage && (
                    <div className="mb-6 animate-slideDown">
                        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border-l-4 border-[#1D6F42] shadow-sm border border-gray-200">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-[#1D6F42] flex-shrink-0">
                                <CheckCircleIcon className="w-5 h-5" />
                            </div>
                            <p className="flex-1 text-sm font-medium text-gray-800">{successMessage}</p>
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Alert */}
                {showError && errorMessage && (
                    <div className="mb-6 animate-slideDown">
                        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm border border-gray-200">
                            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center text-red-500 flex-shrink-0">
                                <ExclamationTriangleIcon className="w-5 h-5" />
                            </div>
                            <p className="flex-1 text-sm font-medium text-gray-800">{errorMessage}</p>
                            <button
                                onClick={() => setShowError(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-3 flex justify-between items-center border-b border-gray-100">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                Time Chart Management
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Manage production time chart for {monthName} {year}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="inline-flex items-center gap-2 h-11 px-5 bg-[#1D6F42] text-white rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                        >
                            <DocumentArrowUpIcon className="w-5 h-5" />
                            Upload Time Chart
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="px-6 pb-4 pt-4 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Year & Month Selector */}
                            <div className="flex gap-3">
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                >
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full h-11 pl-10 pr-10 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                    placeholder="Search by week number or source file..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {needsUpload ? (
                        // No Data State
                        <div className="p-12 text-center">
                            <div className="w-24 h-24 mx-auto mb-6 bg-yellow-50 rounded-2xl flex items-center justify-center">
                                <DocumentArrowUpIcon className="w-12 h-12 text-yellow-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Time Chart Not Available
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                No time chart data found for {monthName} {year}. Please upload an Excel file to get started.
                            </p>
                            {latestBatch && (
                                <p className="text-sm text-gray-400 mb-6">
                                    Last batch: {latestBatch}
                                </p>
                            )}
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D6F42] text-white rounded-xl hover:bg-[#185c38] transition-all"
                            >
                                <DocumentArrowUpIcon className="w-5 h-5" />
                                Upload Time Chart
                            </button>
                        </div>
                    ) : (
                        // Display Time Chart Data
                        <div className="divide-y divide-gray-100">
                            {/* Batch Info */}
                            {latestBatch && (
                                <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100">
                                    <div className="flex items-center gap-2 text-sm text-blue-700">
                                        <ClockIcon className="w-4 h-4" />
                                        <span>Last upload batch: <strong>{latestBatch}</strong></span>
                                    </div>
                                </div>
                            )}

                            {/* Stats Summary */}
                            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-600">Total Weeks:</span>
                                    <span className="font-semibold text-gray-900">{filteredTimeCharts.length}</span>
                                    {filteredTimeCharts.length > 0 && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <span className="text-gray-600">Total Working Days:</span>
                                            <span className="font-semibold text-gray-900">
                                                {filteredTimeCharts.reduce((sum, week) => sum + (week.total_working_days || 0), 0)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Time Chart Cards */}
                            <div className="p-6">
                                {filteredTimeCharts.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {filteredTimeCharts.map((week) => (
                                            <div
                                                key={week.week_number}
                                                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                                            >
                                                {/* Week Header */}
                                                <div className="px-5 py-3 bg-gradient-to-r from-[#1D6F42]/5 to-transparent border-b border-gray-100">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-[#1D6F42]/10 rounded-lg flex items-center justify-center">
                                                                <CalendarIcon className="w-4 h-4 text-[#1D6F42]" />
                                                            </div>
                                                            <h3 className="text-base font-semibold text-gray-900">
                                                                Week {week.week_number}
                                                            </h3>
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {week.total_working_days} working days
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Week Content */}
                                                <div className="p-5">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div>
                                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Week Range
                                                            </span>
                                                            <p className="text-sm text-gray-900 mt-1">
                                                                {week.start_date ? new Date(week.start_date).toLocaleDateString('id-ID') : '-'} 
                                                                {' - '} 
                                                                {week.end_date ? new Date(week.end_date).toLocaleDateString('id-ID') : '-'}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Working Days
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {week.working_days?.map((date, idx) => (
                                                                    <span
                                                                        key={idx}
                                                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700"
                                                                    >
                                                                        {new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Source File
                                                            </span>
                                                            <p className="text-sm text-gray-600 mt-1 truncate" title={week.source_file}>
                                                                {week.source_file || '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500">No matching weeks found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Multi-Step Upload Modal */}
                {showUploadModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Upload Time Chart
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Step {uploadStep} of 4
                                    </p>
                                </div>
                                <button
                                    onClick={closeUploadModal}
                                    className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="px-6 pt-4">
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map((step) => (
                                        <div
                                            key={step}
                                            className={`flex-1 h-2 rounded-full transition-colors ${
                                                step < uploadStep
                                                    ? 'bg-[#1D6F42]'
                                                    : step === uploadStep
                                                    ? 'bg-[#1D6F42]'
                                                    : 'bg-gray-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4 min-h-[300px]">
                                {/* Step 1: Customer Selection */}
                                {uploadStep === 1 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Pilih Customer <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={selectedCustomerId}
                                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                            >
                                                <option value="">-- Pilih Customer --</option>
                                                {customers && customers.map(customer => (
                                                    <option key={customer.id} value={customer.id}>
                                                        {customer.code} - {customer.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-2 text-sm text-gray-600">
                                                Customer dipilih untuk menentukan format file dan parser yang sesuai.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tahun <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                            >
                                                {years.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Bulan <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={selectedMonth}
                                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                            >
                                                {months.map(m => (
                                                    <option key={m.value} value={m.value}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: File & Sheet Selection */}
                                {uploadStep === 2 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Excel File (.xlsx, .xls, .xlsm) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls,.xlsm"
                                                onChange={handleFileSelect}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20"
                                            />
                                            {selectedFile && (
                                                <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                                                    <CheckCircleIcon className="w-4 h-4" />
                                                    {selectedFile.name}
                                                </p>
                                            )}
                                        </div>

                                        {availableSheets.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Pilih Sheet <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={sheetIndex}
                                                    onChange={(e) => {
                                                        setSheetIndex(parseInt(e.target.value));
                                                        setPreviewData(null);
                                                    }}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20"
                                                >
                                                    {availableSheets.map(sheet => (
                                                        <option key={sheet.index} value={sheet.index}>
                                                            {sheet.name} (Sheet {sheet.index})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Step 3: Preview */}
                                {uploadStep === 3 && previewData && (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h4 className="font-medium text-blue-900 mb-2">Preview Data</h4>
                                            <p className="text-sm text-blue-800">Total: {previewData.length} minggu</p>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Week</th>
                                                        <th className="px-4 py-2 text-left font-medium text-gray-700">Start Date</th>
                                                        <th className="px-4 py-2 text-left font-medium text-gray-700">End Date</th>
                                                        <th className="px-4 py-2 text-right font-medium text-gray-700">Working Days</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {previewData.map((week, idx) => (
                                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            <td className="px-4 py-2 text-gray-900 font-medium">W{week.week_number}</td>
                                                            <td className="px-4 py-2 text-gray-700">
                                                                {new Date(week.start_date).toLocaleDateString('id-ID')}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-700">
                                                                {new Date(week.end_date).toLocaleDateString('id-ID')}
                                                            </td>
                                                            <td className="px-4 py-2 text-right text-gray-700 font-medium">
                                                                {week.total_working_days}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <p className="text-sm text-gray-600">
                                            Pastikan data di atas sudah benar sebelum melanjutkan.
                                        </p>
                                    </div>
                                )}

                                {/* Step 4: Confirmation */}
                                {uploadStep === 4 && (
                                    <div className="space-y-4">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <p className="text-sm text-yellow-800">
                                                Siap untuk upload {previewData?.length} minggu untuk {months.find(m => m.value === selectedMonth)?.name} {selectedYear}?
                                            </p>
                                        </div>

                                        {isUploading && (
                                            <div className="bg-blue-50 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-sm text-blue-700">Sedang memproses...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeUploadModal}
                                    disabled={isUploading || isLoadingPreview}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>

                                {uploadStep > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setUploadStep(uploadStep - 1)}
                                        disabled={isUploading || isLoadingPreview}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Back
                                    </button>
                                )}

                                {uploadStep < 4 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (uploadStep === 1) {
                                                if (!selectedCustomerId) {
                                                    setErrorMessage("Pilih customer terlebih dahulu");
                                                    setShowError(true);
                                                    return;
                                                }
                                                setUploadStep(2);
                                            } else if (uploadStep === 2) {
                                                if (!selectedFile) {
                                                    setErrorMessage("Pilih file terlebih dahulu");
                                                    setShowError(true);
                                                    return;
                                                }
                                                handleLoadPreview();
                                            } else if (uploadStep === 3) {
                                                setUploadStep(4);
                                            }
                                        }}
                                        disabled={isUploading || isLoadingPreview}
                                        className="px-4 py-2 bg-[#1D6F42] text-white rounded-lg text-sm font-medium hover:bg-[#185c38] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {uploadStep === 2 && isLoadingPreview ? 'Loading Preview...' : 'Next'}
                                    </button>
                                )}

                                {uploadStep === 4 && (
                                    <button
                                        type="button"
                                        onClick={handleConfirmUpload}
                                        disabled={isUploading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUploading ? 'Uploading...' : 'Confirm Upload'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown {
                    animation: slideDown 0.25s ease-out;
                }
            `}</style>
        </AdminLayout>
    );
}