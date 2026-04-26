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
    ArrowPathIcon
} from "@heroicons/react/24/outline";

export default function Import({ carlines }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedCarline, setSelectedCarline] = useState("");
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

                    const response = await fetch(route("assy.getSheets"), {
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

            const response = await fetch(route("assy.previewSheet"), {
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
        if (!selectedFile || !selectedSheet || !selectedCarline) {
            setErrorMessage("Please select file, sheet and car line first");
            setShowError(true);
            setTimeout(() => setShowError(false), 4000);
            return;
        }

        if (window.confirm("Are you sure you want to import this data? This action cannot be undone.")) {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('sheet', selectedSheet);
            formData.append('carline_id', selectedCarline);

            try {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                if (!csrfToken) {
                    throw new Error("CSRF token not found. Please refresh the page.");
                }

                const response = await fetch(route("assy.import"), {
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
                        router.visit(route("assy.index"));
                    }, 2000);
                } else {
                    setErrorMessage(result.message || "Failed to import assy data");
                    setShowError(true);
                    setTimeout(() => setShowError(false), 4000);
                }
            } catch (error) {
                console.error("Import failed:", error);
                setErrorMessage(error.message || "Failed to import assy data. Please try again.");
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
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <Link href="/dashboard" className="text-gray-600 hover:text-[#1D6F42] transition-colors">
                        Home
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <Link href={route("assy.index")} className="text-gray-600 hover:text-[#1D6F42] transition-colors">
                        Assy Master
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 font-medium">Import Excel</span>
                </div>

                {/* Success Alert */}
                {showSuccess && successMessage && (
                    <div className="mb-6 animate-slideDown">
                        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border-l-4 border-[#1D6F42] shadow-sm border border-gray-200">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-[#1D6F42] flex-shrink-0">
                                <CheckCircleIcon className="w-5 h-5" />
                            </div>
                            <p className="flex-1 text-sm font-medium text-gray-800">{successMessage}</p>
                            <button onClick={() => setShowSuccess(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
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
                            <button onClick={() => setShowError(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {uploading && (
                    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-[#1D6F42] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-700">Processing...</span>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-3 flex justify-between items-center border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <Link
                                href={route("assy.index")}
                                className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1D6F42] transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5" />
                                Back
                            </Link>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                    Import Assy Master from Excel
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Upload Excel file, select sheet, and preview data before importing
                                </p>
                            </div>
                        </div>
                        <DocumentArrowUpIcon className="w-8 h-8 text-[#1D6F42]" />
                    </div>
                    
                    <div className="p-6 space-y-6">
                        {/* Requirements Box */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-green-800 mb-2">
                                <strong>Excel Format Requirements:</strong>
                            </p>
                            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                                <li>File must have columns: part_number, assy_code, level, umh, std_pack</li>
                                <li>part_number must be unique per Car Line</li>
                                <li>Supported formats: .xlsx, .xls, .csv</li>
                            </ul>
                        </div>
                        
                        {/* Car Line Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Car Line <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedCarline}
                                onChange={(e) => setSelectedCarline(e.target.value)}
                                className="w-full md:w-96 h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                            >
                                <option value="">-- Select Car Line --</option>
                                {carlines.map((carline) => (
                                    <option key={carline.id} value={carline.id}>
                                        {carline.code} - {carline.description || carline.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Select Excel File
                            </label>
                            <div className="relative">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1D6F42] file:text-white hover:file:bg-[#185c38] focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                />
                            </div>
                            {selectedFile && (
                                <p className="text-sm text-green-600 mt-2">
                                    ✓ File selected: {selectedFile.name}
                                </p>
                            )}
                        </div>
                        
                        {/* Sheet Selection */}
                        {sheets.length > 0 && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Select Sheet
                                </label>
                                <select
                                    value={selectedSheet}
                                    onChange={(e) => setSelectedSheet(e.target.value)}
                                    className="w-full md:w-96 h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                >
                                    {sheets.map((sheet, index) => (
                                        <option key={index} value={sheet}>
                                            {sheet}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {/* Preview Button */}
                        {selectedFile && selectedSheet && selectedCarline && (
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={handlePreviewSheet}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                    Preview Data
                                </button>
                            </div>
                        )}
                        
                        {/* Preview Table */}
                        {showPreview && previewData.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-md font-semibold text-gray-900">
                                    Data Preview (First 10 rows)
                                </h4>
                                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-[400px]">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {Object.keys(previewData[0] || {}).map((header, idx) => (
                                                    <th key={idx} className="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {previewData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    {Object.values(row).map((value, colIdx) => (
                                                        <td key={colIdx} className="px-4 py-2 text-sm text-gray-600">
                                                            {value || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Showing {previewData.length} rows for preview
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setSelectedCarline("");
                            }}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImportExcel}
                            disabled={!selectedFile || !selectedSheet || !selectedCarline || uploading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? "Importing..." : "Import Data"}
                        </button>
                    </div>
                </div>
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
