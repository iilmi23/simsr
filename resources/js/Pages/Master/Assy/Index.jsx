import { useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import {
    ChevronRightIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    EyeIcon,
    DocumentArrowUpIcon,
    XMarkIcon,
    DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import AdminLayout from "@/Layouts/AdminLayout";

export default function Index({ assy, carlines, filters }) {
    const [search, setSearch] = useState(filters?.search || "");
    const [carlineId, setCarlineId] = useState(filters?.carline_id || "");
    const [isActive, setIsActive] = useState(filters?.is_active || "");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedCarlineForUpload, setSelectedCarlineForUpload] = useState("");
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const { flash } = usePage().props;

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(
            window.route("assy.index"),
            {
                search: search || undefined,
                carline_id: carlineId || undefined,
                is_active: isActive || undefined,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch("");
        setCarlineId("");
        setIsActive("");
        router.get(window.route("assy.index"), {}, { preserveState: true });
    };

    const handleDelete = (id, assyNumber) => {
        if (confirm(`Yakin ingin menghapus assy "${assyNumber}"?`)) {
            router.delete(window.route("assy.destroy", id));
        }
    };

    const handleToggleStatus = (id, currentStatus) => {
        router.patch(window.route("assy.toggle-status", id), {
            is_active: !currentStatus,
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.type === "application/vnd.ms-excel")) {
            setUploadFile(file);
        } else {
            alert("Please upload a valid Excel file (.xlsx or .xls)");
            e.target.value = "";
        }
    };

    const handleUpload = () => {
        if (!uploadFile) {
            alert("Please select a file first");
            return;
        }

        if (!selectedCarlineForUpload) {
            alert("Please select Car Line first");
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append("excel_file", uploadFile);
        formData.append("carline_id", selectedCarlineForUpload);

        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 200);

        router.post(window.route("assy.upload"), formData, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                clearInterval(interval);
                setUploadProgress(100);
                setTimeout(() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setSelectedCarlineForUpload("");
                    setUploadProgress(0);
                    setUploading(false);
                }, 500);
            },
            onError: (errors) => {
                clearInterval(interval);
                setUploading(false);
                setUploadProgress(0);
                console.error("Upload error:", errors);
                alert("Upload failed: " + (errors.message || "Please check your file and try again"));
            },
            onFinish: () => {
                clearInterval(interval);
                setUploading(false);
            }
        });
    };

    const downloadTemplate = async () => {
        if (!selectedCarlineForUpload) {
            alert("Please select Car Line first before downloading template");
            return;
        }

        setDownloadingTemplate(true);
        
        try {
            // Try to get the template URL
            const templateUrl = window.route("assy.download-template", {
                carline_id: selectedCarlineForUpload
            });
            
            // Create a hidden anchor element to trigger download
            const link = document.createElement('a');
            link.href = templateUrl;
            link.download = `assy_template_carline_${selectedCarlineForUpload}.xlsx`;
            
            // Add CSRF token for security
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (csrfToken) {
                link.setAttribute('data-csrf', csrfToken);
            }
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
                setDownloadingTemplate(false);
            }, 1000);
            
        } catch (error) {
            console.error("Download error:", error);
            alert("Failed to download template. Please try again or contact administrator.");
            setDownloadingTemplate(false);
        }
    };

    // Alternative method using fetch for better error handling
    const downloadTemplateWithFetch = async () => {
        if (!selectedCarlineForUpload) {
            alert("Please select Car Line first before downloading template");
            return;
        }

        setDownloadingTemplate(true);
        
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            const response = await fetch(window.route("assy.download-template", {
                carline_id: selectedCarlineForUpload
            }), {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `assy_template_carline_${selectedCarlineForUpload}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error("Download error:", error);
            alert("Failed to download template. Please check if the template file exists or contact administrator.");
        } finally {
            setDownloadingTemplate(false);
        }
    };

    // Create manual template if server route doesn't exist
    const createManualTemplate = () => {
        if (!selectedCarlineForUpload) {
            alert("Please select Car Line first");
            return;
        }

        // Create sample data for template
        const sampleData = [
            ['part_number', 'assy_code', 'level', 'umh', 'std_pack', 'type', 'description'],
            ['ABC-001', 'ASM001', '1', '1.5', '10', 'A', 'Sample Assy 1'],
            ['ABC-002', 'ASM002', '2', '2.0', '20', 'B', 'Sample Assy 2'],
            ['ABC-003', 'ASM003', '1', '1.8', '15', 'A', 'Sample Assy 3'],
        ];

        // Convert to CSV
        const csvContent = sampleData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `assy_template_carline_${selectedCarlineForUpload}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                {flash?.success && (
                    <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-r-xl animate-slideDown">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {flash.success}
                        </div>
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl animate-slideDown">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {flash.error}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 mb-4 text-sm">
                    <span className="text-gray-600">Master</span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 font-medium">Assy</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="p-6 pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                Assy Master
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Data master assy untuk mengisi SPP.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {/* <Link
                                href={window.route("assy.importPage")}
                                className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
                            >
                                <DocumentArrowUpIcon className="w-4 h-4" />
                                Import Excel
                            </Link> */}
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-gray-600 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                Upload Excel
                            </button>
                            <Link
                                href={window.route("assy.create")}
                                className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Assy
                            </Link>
                        </div>
                    </div>

                    <div className="p-6 pb-0">
                        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                            <div className="relative flex-1 min-w-[200px]">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Cari assy number, assy code..."
                                    className="w-full h-11 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                />
                            </div>

                            <select
                                value={carlineId}
                                onChange={(e) => setCarlineId(e.target.value)}
                                className="h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] bg-white"
                            >
                                <option value="">All Car Lines</option>
                                {carlines?.map((cl) => (
                                    <option key={cl.id} value={cl.id}>
                                        {cl.code} {cl.description ? `- ${cl.description}` : ""}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={isActive}
                                onChange={(e) => setIsActive(e.target.value)}
                                className="h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] bg-white"
                            >
                                <option value="">All Status</option>
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>

                            <button
                                type="submit"
                                className="h-11 px-5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition"
                            >
                                Cari
                            </button>

                            {(search || carlineId || isActive) && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="h-11 px-5 text-gray-500 text-sm hover:text-gray-700 transition"
                                >
                                    Reset
                                </button>
                            )}
                        </form>
                    </div>

                    <div className="p-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assy Number</th>
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assy Code</th>
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Car Line</th>
                                        <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">UMH</th>
                                        <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Std Pack</th>
                                        <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assy?.data?.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-12 text-gray-400">
                                                Tidak ada data ditemukan.
                                            </td>
                                        </tr>
                                    ) : (
                                        assy?.data?.map((assyItem, index) => (
                                            <tr key={assyItem.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                                <td className="py-3 px-2 text-gray-500">
                                                    {(assy.current_page - 1) * assy.per_page + index + 1}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <span className="font-mono font-medium text-gray-900">
                                                        {assyItem.part_number}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-gray-700">{assyItem.assy_code}</td>
                                                <td className="py-3 px-2 text-gray-600">{assyItem.level}</td>
                                                <td className="py-3 px-2">
                                                    {assyItem.carline ? (
                                                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                                                            {assyItem.carline.code}
                                                        </span>
                                                    ) : "-"}
                                                </td>
                                                <td className="py-3 px-2 text-gray-600">{assyItem.type || "-"}</td>
                                                <td className="py-3 px-2 text-right font-mono text-gray-700">
                                                    {parseFloat(assyItem.umh).toFixed(4)}
                                                </td>
                                                <td className="py-3 px-2 text-right text-gray-700">{assyItem.std_pack}</td>
                                                <td className="py-3 px-2 text-center">
                                                    <button
                                                        onClick={() => handleToggleStatus(assyItem.id, assyItem.is_active)}
                                                        className={`px-3 py-1 text-xs font-medium rounded-full transition ${
                                                            assyItem.is_active
                                                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                        }`}
                                                    >
                                                        {assyItem.is_active ? "Active" : "Inactive"}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Link
                                                            href={window.route("assy.show", assyItem.id)}
                                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                                                            title="Detail"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </Link>
                                                        <Link
                                                            href={window.route("assy.edit", assyItem.id)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Edit"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDelete(assyItem.id, assyItem.part_number)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Hapus"
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

                        {/* Pagination */}
                        {assy?.last_page > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-500">
                                    Menampilkan {(assy.current_page - 1) * assy.per_page + 1}–
                                    {Math.min(assy.current_page * assy.per_page, assy.total)} dari {assy.total} data
                                </p>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => router.get(window.route("assy.index"), {
                                            page: assy.current_page - 1,
                                            search: filters.search,
                                            carline_id: filters.carline_id,
                                            is_active: filters.is_active,
                                        }, { preserveState: true })}
                                        disabled={assy.current_page === 1}
                                        className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                                            assy.current_page === 1
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        ←
                                    </button>
                                    {Array.from({ length: Math.min(5, assy.last_page) }, (_, i) => {
                                        let page;
                                        if (assy.last_page <= 5) {
                                            page = i + 1;
                                        } else if (assy.current_page <= 3) {
                                            page = i + 1;
                                        } else if (assy.current_page >= assy.last_page - 2) {
                                            page = assy.last_page - 4 + i;
                                        } else {
                                            page = assy.current_page - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => router.get(window.route("assy.index"), {
                                                    page,
                                                    search: filters.search,
                                                    carline_id: filters.carline_id,
                                                    is_active: filters.is_active,
                                                }, { preserveState: true })}
                                                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                                                    page === assy.current_page
                                                        ? "bg-[#1D6F42] text-white"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => router.get(window.route("assy.index"), {
                                            page: assy.current_page + 1,
                                            search: filters.search,
                                            carline_id: filters.carline_id,
                                            is_active: filters.is_active,
                                        }, { preserveState: true })}
                                        disabled={assy.current_page === assy.last_page}
                                        className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                                            assy.current_page === assy.last_page
                                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Modal - Improved with better template download */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => !uploading && setShowUploadModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-2xl shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="px-6 pt-6 pb-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Upload Excel File</h3>
                                    {!uploading && (
                                        <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-500">
                                            <XMarkIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Pilih Car Line <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={selectedCarlineForUpload}
                                            onChange={(e) => setSelectedCarlineForUpload(e.target.value)}
                                            disabled={uploading}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        >
                                            <option value="">-- Pilih Car Line --</option>
                                            {carlines?.map((cl) => (
                                                <option key={cl.id} value={cl.id}>
                                                    {cl.code} - {cl.description || cl.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-xs text-gray-500">Data Assy akan diupload untuk Car Line yang dipilih</p>
                                    </div>
                                    
                                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-blue-800 mb-2"><strong>Instructions:</strong></p>
                                        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                                            <li>Pilih Car Line terlebih dahulu</li>
                                            <li>Download template sesuai Car Line yang dipilih</li>
                                            <li>Upload file Excel (.xlsx or .xls)</li>
                                            <li>Kolom wajib: part_number, assy_code, level, umh, std_pack</li>
                                            <li>part_number harus unique dalam 1 Car Line</li>
                                        </ul>
                                        
                                        {/* Template Download Buttons */}
                                        <div className="mt-3 flex gap-2">
                                            <button
                                                onClick={downloadTemplate}
                                                disabled={!selectedCarlineForUpload || uploading || downloadingTemplate}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                                                    selectedCarlineForUpload && !uploading && !downloadingTemplate
                                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                }`}
                                            >
                                                {downloadingTemplate ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Downloading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <DocumentArrowDownIcon className="w-4 h-4" />
                                                        Download Excel Template
                                                    </>
                                                )}
                                            </button>
                                            
                                            <button
                                                onClick={createManualTemplate}
                                                disabled={!selectedCarlineForUpload || uploading}
                                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                                                    selectedCarlineForUpload && !uploading
                                                        ? "bg-green-600 text-white hover:bg-green-700"
                                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                }`}
                                            >
                                                <DocumentArrowDownIcon className="w-4 h-4" />
                                                Download CSV Template
                                            </button>
                                        </div>
                                        
                                        <p className="text-xs text-blue-600 mt-2">
                                            💡 Jika download Excel tidak berhasil, gunakan tombol CSV Template sebagai alternatif
                                        </p>
                                    </div>
                                    
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Choose Excel File</label>
                                        <input
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleFileChange}
                                            disabled={uploading || !selectedCarlineForUpload}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1D6F42] file:text-white hover:file:bg-[#185c38] cursor-pointer disabled:opacity-50"
                                        />
                                        {uploadFile && <p className="mt-2 text-sm text-green-600">Selected: {uploadFile.name}</p>}
                                    </div>
                                    
                                    {uploading && (
                                        <div className="mt-4 animate-slideDown">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-600">Uploading...</span>
                                                <span className="text-sm font-medium text-[#1D6F42]">{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div className="bg-[#1D6F42] h-2 rounded-full transition-all duration-300 relative overflow-hidden" style={{ width: `${uploadProgress}%` }}>
                                                    <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <button 
                                    onClick={() => setShowUploadModal(false)} 
                                    disabled={uploading} 
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUpload} 
                                    disabled={!uploadFile || !selectedCarlineForUpload || uploading} 
                                    className="px-4 py-2 text-sm font-medium text-white bg-[#1D6F42] rounded-lg hover:bg-[#185c38] disabled:opacity-50 transition"
                                >
                                    {uploading ? "Uploading..." : "Upload"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                @keyframes shimmer {
                    0% {
                        transform: translateX(-100%);
                    }
                    100% {
                        transform: translateX(100%);
                    }
                }
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>
        </AdminLayout>
    );
}