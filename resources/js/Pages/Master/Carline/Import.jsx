import AdminLayout from "@/Layouts/AdminLayout";
import { Link, router } from "@inertiajs/react";
import { useState, useRef } from "react";
import {
    ChevronRightIcon,
    DocumentArrowUpIcon,
    EyeIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    CloudArrowUpIcon,
    TableCellsIcon,
    ArrowPathIcon
} from "@heroicons/react/24/outline";

export default function Import() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState("");
    const [previewData, setPreviewData] = useState([]);
    const [showPreview, setShowPreview] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const extension = file.name.split('.').pop().toLowerCase();
            if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
                setSelectedFile(file);
                setSelectedSheet("");
                setSheets([]);
                setPreviewData([]);
                setShowPreview(false);
                
                const formData = new FormData();
                formData.append('file', file);
                
                setUploading(true);
                try {
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                    if (!csrfToken) {
                        throw new Error("CSRF token not found. Please refresh the page.");
                    }

                    const response = await fetch(route("carline.getSheets"), {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-CSRF-TOKEN': csrfToken
                        }
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        setSheets(result.sheets);
                        if (result.sheets.length > 0) {
                            setSelectedSheet(result.sheets[0]);
                        }
                        setSuccessMessage("File uploaded successfully! Please select a sheet.");
                        setShowSuccess(true);
                        setTimeout(() => setShowSuccess(false), 3000);
                    } else {
                        setErrorMessage(result.message || "Failed to read Excel file");
                        setShowError(true);
                        setTimeout(() => setShowError(false), 4000);
                    }
                } catch (error) {
                    console.error("Error:", error);
                    setErrorMessage(error.message || "Failed to read Excel file. Please check file format.");
                    setShowError(true);
                    setTimeout(() => setShowError(false), 4000);
                } finally {
                    setUploading(false);
                }
            } else {
                setErrorMessage("Please select a valid Excel file (.xlsx, .xls, or .csv)");
                setShowError(true);
                setTimeout(() => setShowError(false), 4000);
                e.target.value = '';
            }
        }
    };

    const handlePreviewSheet = async () => {
        if (!selectedFile || !selectedSheet) {
            setErrorMessage("Please select file and sheet first");
            setShowError(true);
            setTimeout(() => setShowError(false), 4000);
            return;
        }
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('sheet', selectedSheet);
        
        setUploading(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (!csrfToken) {
                throw new Error("CSRF token not found. Please refresh the page.");
            }

            const response = await fetch(route("carline.previewSheet"), {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRF-TOKEN': csrfToken
                }
            });
            
            const result = await response.json();
            if (result.success) {
                setPreviewData(result.data);
                setShowPreview(true);
                setSuccessMessage("Preview loaded successfully!");
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                setErrorMessage(result.message || "Failed to preview sheet");
                setShowError(true);
                setTimeout(() => setShowError(false), 4000);
            }
        } catch (error) {
            console.error("Error:", error);
            setErrorMessage(error.message || "Failed to preview sheet. Please try again.");
            setShowError(true);
            setTimeout(() => setShowError(false), 4000);
        } finally {
            setUploading(false);
        }
    };

    const handleImportExcel = async () => {
        if (!selectedFile || !selectedSheet) {
            setErrorMessage("Please select file and sheet first");
            setShowError(true);
            setTimeout(() => setShowError(false), 4000);
            return;
        }

        if (window.confirm("Are you sure you want to import this data? This action cannot be undone.")) {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('sheet', selectedSheet);

            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                if (!csrfToken) {
                    throw new Error("CSRF token not found. Please refresh the page.");
                }

                const response = await fetch(route("carline.import"), {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRF-TOKEN': csrfToken
                    }
                });
                
                const result = await response.json();
                if (result.success) {
                    setSuccessMessage(result.message || "Data imported successfully!");
                    setShowSuccess(true);
                    setTimeout(() => {
                        router.visit(route("carline.index"));
                    }, 2000);
                } else {
                    setErrorMessage(result.message || "Failed to import carlines");
                    setShowError(true);
                    setTimeout(() => setShowError(false), 4000);
                }
            } catch (error) {
                console.error("Import failed:", error);
                setErrorMessage(error.message || "Failed to import carlines. Please try again.");
                setShowError(true);
                setTimeout(() => setShowError(false), 4000);
            } finally {
                setUploading(false);
            }
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setSheets([]);
        setSelectedSheet("");
        setPreviewData([]);
        setShowPreview(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 pt-2 pb-8 px-4 md:px-6 lg:px-8 font-sans">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 mb-6 text-sm" aria-label="Breadcrumb">
                    <Link href="/dashboard" className="text-gray-500 hover:text-[#1D6F42] transition-colors duration-200">
                        Home
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <Link href={route("carline.index")} className="text-gray-500 hover:text-[#1D6F42] transition-colors duration-200">
                        Carline
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 font-medium">Import Excel</span>
                </nav>

                {/* Success Alert */}
                {showSuccess && successMessage && (
                    <div className="mb-6 animate-slideDown">
                        <div className="flex items-center gap-3 bg-white rounded-xl border-l-4 border-[#1D6F42] shadow-sm p-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                                <CheckCircleIcon className="w-5 h-5 text-[#1D6F42]" />
                            </div>
                            <p className="flex-1 text-sm text-gray-700">{successMessage}</p>
                            <button 
                                onClick={() => setShowSuccess(false)} 
                                className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Alert */}
                {showError && errorMessage && (
                    <div className="mb-6 animate-slideDown">
                        <div className="flex items-center gap-3 bg-white rounded-xl border-l-4 border-red-500 shadow-sm p-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                            </div>
                            <p className="flex-1 text-sm text-gray-700">{errorMessage}</p>
                            <button 
                                onClick={() => setShowError(false)} 
                                className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                                aria-label="Close"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {uploading && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-3">
                            <div className="w-6 h-6 border-2 border-[#1D6F42] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium text-gray-700">Processing your request...</span>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Link
                                        href={route("carline.index")}
                                        className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-[#1D6F42] hover:bg-gray-100 rounded-lg transition-all duration-200"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4" />
                                        <span className="text-sm font-medium">Back</span>
                                    </Link>
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                                            Import Carline Data
                                        </h1>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Upload Excel file, select sheet, and preview before importing
                                        </p>
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <div className="w-12 h-12 bg-[#1D6F42]/10 rounded-xl flex items-center justify-center">
                                        <DocumentArrowUpIcon className="w-6 h-6 text-[#1D6F42]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* Requirements Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-semibold text-blue-900 mb-2">Excel Format Requirements</h3>
                                        <ul className="text-sm text-blue-800 space-y-1">
                                            <li className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                                File must have a column named <code className="px-1.5 py-0.5 bg-blue-100 rounded text-xs font-mono">code</code> (case sensitive)
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                                Each code must be unique
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                                                Supported formats: <span className="font-medium">.xlsx, .xls, .csv</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            
                            {/* File Upload Section */}
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Select Excel File
                                </label>
                                <div className="relative">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileChange}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1D6F42] file:text-white hover:file:bg-[#185c38] focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all duration-200 cursor-pointer"
                                    />
                                </div>
                                {selectedFile && (
                                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        <span>File selected: <span className="font-medium">{selectedFile.name}</span></span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Sheet Selection */}
                            {sheets.length > 0 && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Select Worksheet
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedSheet}
                                            onChange={(e) => setSelectedSheet(e.target.value)}
                                            className="w-full md:w-96 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all duration-200 appearance-none bg-white cursor-pointer"
                                        >
                                            {sheets.map((sheet, index) => (
                                                <option key={index} value={sheet}>
                                                    {sheet}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Action Buttons */}
                            {selectedFile && selectedSheet && (
                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        onClick={handlePreviewSheet}
                                        disabled={uploading}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border-2 border-[#1D6F42] text-[#1D6F42] rounded-xl text-sm font-semibold hover:bg-[#1D6F42] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                        Preview Data
                                    </button>
                                    <button
                                        onClick={handleImportExcel}
                                        disabled={uploading}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#1D6F42] text-white rounded-xl text-sm font-semibold hover:bg-[#185c38] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        <CloudArrowUpIcon className="w-4 h-4" />
                                        Import to Database
                                    </button>
                                    <button
                                        onClick={resetForm}
                                        disabled={uploading}
                                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className="w-4 h-4" />
                                        Reset
                                    </button>
                                </div>
                            )}
                            
                            {/* Preview Table */}
                            {showPreview && previewData.length > 0 && (
                                <div className="space-y-4 animate-slideDown">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TableCellsIcon className="w-5 h-5 text-[#1D6F42]" />
                                            <h4 className="text-base font-semibold text-gray-900">
                                                Data Preview
                                            </h4>
                                        </div>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {previewData.length} rows displayed
                                        </span>
                                    </div>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[500px]">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        {Object.keys(previewData[0] || {}).map((header, idx) => (
                                                            <th key={idx} className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                {header}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {previewData.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                                                            {Object.values(row).map((value, colIdx) => (
                                                                <td key={colIdx} className="px-4 py-2.5 text-sm text-gray-600">
                                                                    {value || <span className="text-gray-400">—</span>}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 text-center">
                                        Showing first {Math.min(previewData.length, 10)} rows. Review before importing.
                                    </p>
                                </div>
                            )}

                            {/* Empty State */}
                            {!selectedFile && (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <DocumentArrowUpIcon className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500">No file selected. Please upload an Excel file to begin.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
            `}</style>
        </AdminLayout>
    );
}