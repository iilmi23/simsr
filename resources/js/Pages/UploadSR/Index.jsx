import AdminLayout from "@/Layouts/AdminLayout";
import { usePage, router } from "@inertiajs/react";
import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import ExcelPreview from "@/Components/ExcelPreview";

import {
    ChevronRightIcon,
    CheckCircleIcon,
    XMarkIcon,
    DocumentArrowUpIcon,
    TableCellsIcon,
    UserGroupIcon,
    DocumentTextIcon,
    EyeIcon,
    CloudArrowUpIcon,
    ChartBarIcon,
    DocumentCheckIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    PaintBrushIcon,
    Squares2X2Icon,
} from "@heroicons/react/24/outline";

export default function Index() {
    const { customers = [], flash = {}, errors = {} } = usePage().props;

    const [showAlert, setShowAlert] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [srNumber, setSrNumber] = useState("");
    const [selectedPort, setSelectedPort] = useState("");
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState("");

    const [workbook, setWorkbook] = useState(null);
    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState("");
    const [previewSummary, setPreviewSummary] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [showGridlines, setShowGridlines] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const containerRef = useRef(null);

    const selectedCustomerData = customers.find((c) => String(c.id) === String(selectedCustomer));
    const customerPorts = selectedCustomerData?.ports || [];
    const requiresPort = customerPorts.length > 0;

    useEffect(() => {
        if (flash?.success) {
            setShowAlert(true);
            const timer = setTimeout(() => setShowAlert(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const handleFileChange = (e) => {
        const uploadedFile = e.target.files[0];
        setFile(uploadedFile);
        setFileName(uploadedFile?.name || "");
        setPreviewSummary(null);
        setSheets([]);
        setSelectedSheet("");

        if (!uploadedFile) return;

        const reader = new FileReader();
        reader.readAsArrayBuffer(uploadedFile);

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { 
                type: "array", 
                cellStyles: true,
                cellFormula: true,
                cellNF: true,
                cellDates: true
            });

            setWorkbook(wb);
            setSheets(wb.SheetNames);
        };
    };

    const handleSheetChange = (e) => {
        const sheetIndex = parseInt(e.target.value);
        const sheetName = sheets[sheetIndex];
        setSelectedSheet(sheetIndex);
    };

    const handlePreviewMapping = async () => {
        if (!selectedCustomer || !file || selectedSheet === "") {
            alert("Please complete all fields (Customer, File, and Sheet)");
            return;
        }

        setPreviewLoading(true);

        const formData = new FormData();
        formData.append("customer", selectedCustomer);
        formData.append("port", selectedPort);
        formData.append("file", file);
        formData.append("sheet", selectedSheet);

        try {
            const response = await axios.post(route("sr.preview"), formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (response.data.success) {
                setPreviewSummary(response.data.data);
                setShowPreviewModal(true);
            } else {
                alert("Preview failed: " + (response.data.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Preview error:", error);
            alert("Preview error: " + (error.response?.data?.error || error.message));
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleSubmit = () => {
        if (!selectedCustomer || !srNumber || !file || selectedSheet === "") {
            alert("Please complete all fields including sheet");
            return;
        }

        const formData = new FormData();
        formData.append("customer", selectedCustomer);
        formData.append("port", selectedPort);
        formData.append("sr_number", srNumber);
        formData.append("file", file);
        formData.append("sheet", selectedSheet);

        setLoading(true);

        router.post(route("sr.upload"), formData, {
            forceFormData: true,
            preserveScroll: true,

            onSuccess: () => {
                setLoading(false);
                setSelectedCustomer("");
                setSrNumber("");
                setFile(null);
                setFileName("");
                setWorkbook(null);
                setSheets([]);
                setSelectedSheet("");
                setPreviewSummary(null);
                setShowPreviewModal(false);
            },

            onError: (err) => {
                console.error("ERROR DETAIL:", err);
                alert(JSON.stringify(err, null, 2));
            },

            onFinish: () => {
                setLoading(false);
            }
        });
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement && containerRef.current) {
            containerRef.current.requestFullscreen();
            setFullscreen(true);
        } else {
            document.exitFullscreen();
            setFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                {/* BREADCRUMB */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                    <span>Menu</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span>Shipping Release</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span className="text-gray-900 font-medium">Upload SR</span>
                </div>

                {/* SUCCESS ALERT */}
                {showAlert && (
                    <div className="mb-6 animate-slideDown">
                        <div className="flex items-center justify-between bg-[#1D6F42]/10 border border-[#1D6F42]/20 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircleIcon className="w-5 h-5 text-[#1D6F42]" />
                                <span className="text-sm text-[#1D6F42]">{flash.success}</span>
                            </div>
                            <button
                                onClick={() => setShowAlert(false)}
                                className="text-[#1D6F42] hover:text-[#145330]"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ERROR ALERT */}
                {Object.keys(errors).length > 0 && (
                    <div className="mb-6 animate-slideDown">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                            {Object.values(errors).map((err, i) => (
                                <p key={i} className="text-sm text-red-600 flex items-center gap-2">
                                    <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                                    {err}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* MAIN CARD */}
                <div className="max-w-full mx-auto">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                        {/* HEADER */}
                        <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-5">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h1 className="text-xl font-semibold text-gray-900">
                                        Upload Shipping Release (SR)
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        Upload Excel file, select sheet, review raw data, then map and upload
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* FORM SECTION */}
                        <div className="p-6 border-b border-gray-200 bg-white">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <UserGroupIcon className="w-4 h-4 text-gray-400" />
                                                <span>Customer</span>
                                            </div>
                                        </label>
                                        <select
                                            value={selectedCustomer}
                                            onChange={(e) => {
                                                setSelectedCustomer(e.target.value);
                                                setSelectedPort("");
                                            }}
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all duration-200 text-gray-700"
                                        >
                                            <option value="">Select Customer</option>
                                            {customers.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.code}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {customerPorts.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <UserGroupIcon className="w-4 h-4 text-gray-400" />
                                                    <span>Port</span>
                                                </div>
                                            </label>
                                            <select
                                                value={selectedPort}
                                                onChange={(e) => setSelectedPort(e.target.value)}
                                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all duration-200 text-gray-700"
                                            >
                                                <option value="">-- Select Port --</option>
                                                {customerPorts.map((port) => (
                                                    <option key={port.id} value={port.id}>
                                                        {port.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {requiresPort && !selectedPort && (
                                                <p className="text-xs text-red-600 mt-2">Port harus dipilih untuk customer ini.</p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                                                <span>SR Number</span>
                                            </div>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Example: JAI 2026-03-01"
                                            value={srNumber}
                                            onChange={(e) => setSrNumber(e.target.value)}
                                            className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all duration-200 text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <DocumentArrowUpIcon className="w-4 h-4 text-gray-400" />
                                                <span>Upload Excel File</span>
                                            </div>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                id="file-upload"
                                            />
                                            <label
                                                htmlFor="file-upload"
                                                className="flex items-center gap-3 w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all duration-200"
                                            >
                                                <DocumentArrowUpIcon className="w-5 h-5 text-gray-400" />
                                                <span className={`text-sm ${fileName ? 'text-gray-700' : 'text-gray-400'}`}>
                                                    {fileName || 'Select Excel File...'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    {sheets.length > 0 && (
                                        <div className="animate-fadeIn">
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <TableCellsIcon className="w-4 h-4 text-gray-400" />
                                                    <span>Select Sheet</span>
                                                </div>
                                            </label>
                                            <select
                                                value={selectedSheet}
                                                onChange={handleSheetChange}
                                                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1D6F42] focus:border-[#1D6F42] transition-all duration-200 text-gray-700"
                                            >
                                                <option value="">-- Select Sheet --</option>
                                                {sheets.map((sheet, index) => (
                                                    <option key={index} value={index}>
                                                        {sheet}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handlePreviewMapping}
                                    disabled={previewLoading || !selectedCustomer || !file || selectedSheet === ""}
                                    className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm flex items-center gap-2"
                                >
                                    {previewLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Mapping...</span>
                                        </>
                                    ) : (
                                        <>
                                            <EyeIcon className="w-5 h-5" />
                                            <span>Preview Mapping Result</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading || (requiresPort && !selectedPort)}
                                    className="px-8 py-3 bg-[#1D6F42] text-white rounded-xl hover:bg-[#145330] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Uploading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CloudArrowUpIcon className="w-5 h-5" />
                                            <span>Upload SR</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* EXCEL PREVIEW SECTION */}
                        {selectedSheet !== "" && workbook && (
                            <div className="animate-fadeIn">
                                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-3">
                                        <TableCellsIcon className="w-5 h-5 text-[#1D6F42]" />
                                        <h2 className="font-medium text-gray-700">
                                            Excel Preview - <span className="text-[#1D6F42]">{sheets[selectedSheet]}</span>
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Zoom:</span>
                                            <select
                                                value={zoom}
                                                onChange={(e) => setZoom(Number(e.target.value))}
                                                className="h-8 px-2 text-sm border border-gray-200 rounded-lg bg-white"
                                            >
                                                <option value={75}>75%</option>
                                                <option value={100}>100%</option>
                                                <option value={125}>125%</option>
                                                <option value={150}>150%</option>
                                                <option value={200}>200%</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => setShowGridlines(!showGridlines)}
                                            className={`p-1.5 rounded-lg transition-colors ${showGridlines ? 'bg-[#1D6F42] text-white' : 'bg-gray-200 text-gray-600'}`}
                                            title={showGridlines ? "Hide Gridlines" : "Show Gridlines"}
                                        >
                                            <Squares2X2Icon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={toggleFullscreen}
                                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                            title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                        >
                                            {fullscreen ? 
                                                <ArrowsPointingInIcon className="w-4 h-4 text-gray-600" /> : 
                                                <ArrowsPointingOutIcon className="w-4 h-4 text-gray-600" />
                                            }
                                        </button>
                                    </div>
                                </div>
                                <div ref={containerRef}>
                                    <ExcelPreview
                                        workbook={workbook}
                                        sheetName={sheets[selectedSheet]}
                                        zoom={zoom}
                                        showGridlines={showGridlines}
                                    />
                                </div>
                            </div>
                        )}

                        {/* NO SHEET SELECTED STATE */}
                        {sheets.length > 0 && selectedSheet === "" && (
                            <div className="p-12 text-center">
                                <TableCellsIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-400">Select a sheet to preview Excel data</p>
                                <p className="text-xs text-gray-400 mt-1">The preview will show colors, borders, and formatting exactly like the original Excel file</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* PREVIEW MAPPING MODAL - Same as before */}
            {showPreviewModal && previewSummary && (
                // ... modal content (same as previous)
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    {/* ... modal content ... */}
                </div>
            )}
        </AdminLayout>
    );
}