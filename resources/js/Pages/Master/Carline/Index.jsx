import AdminLayout from "@/Layouts/AdminLayout";
import { Link, router, useForm } from "@inertiajs/react";
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
    DocumentArrowUpIcon
} from "@heroicons/react/24/outline";

export default function Index({ carlines, flash, filters }) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState(filters?.search || "");
    const [isProcessing, setIsProcessing] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'code', direction: 'asc' });
    const [filterOpen, setFilterOpen] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    
    const { data, setData, post, reset, processing: addProcessing, errors: addErrors } = useForm({
        code: "",
    });

    // Handle flash messages
    useEffect(() => {
        const successMsg = flash?.success || flash?.message || flash?.flash?.success;
        const errorMsg = flash?.error || flash?.flash?.error;

        if (successMsg) {
            setSuccessMessage(successMsg);
            setShowSuccess(true);
            setIsProcessing(false);
            
            const timer = setTimeout(() => {
                setShowSuccess(false);
                setSuccessMessage("");
            }, 3000);
            return () => clearTimeout(timer);
        }
        
        if (errorMsg) {
            setErrorMessage(errorMsg);
            setShowError(true);
            setIsProcessing(false);
            
            const timer = setTimeout(() => {
                setShowError(false);
                setErrorMessage("");
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    // Debounce search
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchTerm !== (filters?.search || "")) {
                router.get(
                    route("carline.index"),
                    { search: searchTerm || undefined },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                        only: ["carlines", "filters"],
                    }
                );
            }
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm]);

    const handleDelete = (id, code) => {
        setDeleteTarget({ id, code });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        
        setIsProcessing(true);
        router.delete(route("carline.destroy", deleteTarget.id), {
            onSuccess: () => {
                setDeleteTarget(null);
            },
            onError: (errors) => {
                console.error("Delete failed:", errors);
                setIsProcessing(false);
                setDeleteTarget(null);
                setErrorMessage("Failed to delete carline");
                setShowError(true);
            }
        });
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUpIcon className="w-4 h-4 text-[#1D6F42]" />
            : <ArrowDownIcon className="w-4 h-4 text-[#1D6F42]" />;
    };

    const handleAddCarline = (e) => {
        e.preventDefault();
        post(route("carline.store"), {
            onSuccess: () => {
                setShowAddModal(false);
                reset();
            },
            onError: () => {
                // Error handling is automatic via useForm
            }
        });
    };

    const openAddModal = () => {
        reset();
        setShowAddModal(true);
    };

    // Handle both paginated object and plain array
    const carlineList = Array.isArray(carlines) ? carlines : (carlines?.data ?? []);
    const totalData = carlines?.total || carlineList.length;

    const processedCarlines = useMemo(() => {
        let filtered = carlineList.filter(c =>
            (c.code || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key] ?? '';
                let bVal = b[sortConfig.key] ?? '';
                const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }

        return filtered;
    }, [carlineList, searchTerm, sortConfig]);

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <Link href="/dashboard" className="text-gray-600 hover:text-[#1D6F42] transition-colors">
                        Home
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 font-medium">Carline</span>
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
                                onClick={() => {
                                    setShowSuccess(false);
                                    setSuccessMessage("");
                                }}
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
                                onClick={() => {
                                    setShowError(false);
                                    setErrorMessage("");
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {(isProcessing || addProcessing) && (
                    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-[#1D6F42] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-gray-700">
                                {addProcessing ? "Saving..." : "Processing..."}
                            </span>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-3 flex justify-between items-center border-b border-gray-100">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                Carline Management
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Manage all car lines in the system
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                href={route("carline.import")}
                                className="inline-flex items-center gap-2 h-11 px-5 bg-[#1D6F42] text-white rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                            >
                                <DocumentArrowUpIcon className="w-5 h-5" />
                                Import Excel
                            </Link>
                            <button
                                onClick={openAddModal}
                                className="inline-flex items-center gap-2 h-11 px-5 bg-[#1D6F42] text-white rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Add Carline
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="px-6 pb-4 pt-4 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full h-11 pl-10 pr-10 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                    placeholder="Search by code..."
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

                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={() => setFilterOpen(!filterOpen)}
                                    className={`inline-flex items-center gap-2 h-11 px-4 border rounded-xl text-sm font-medium transition-all ${
                                        filterOpen
                                            ? 'bg-[#1D6F42]/10 border-[#1D6F42]/30 text-[#1D6F42]'
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <FunnelIcon className="w-5 h-5" />
                                    Sort
                                </button>
                            </div>
                        </div>

                        {/* Sort Panel */}
                        {filterOpen && (
                            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-slideDown">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-800">Sort By</h3>
                                    <button
                                        onClick={() => setSortConfig({ key: 'code', direction: 'asc' })}
                                        className="text-xs text-[#1D6F42] hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleSort('code')}
                                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            sortConfig.key === 'code'
                                                ? 'bg-[#1D6F42] text-white shadow-sm'
                                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        Code
                                        {sortConfig.key === 'code' && (
                                            sortConfig.direction === 'asc'
                                                ? <ArrowUpIcon className="w-4 h-4" />
                                                : <ArrowDownIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[400px]">
                            <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-200">
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-16 border-r border-gray-200">
                                        #
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42]"
                                        onClick={() => handleSort('code')}
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            Code
                                            {getSortIcon('code')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider w-44">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedCarlines.length > 0 ? (
                                    processedCarlines.map((carline, index) => (
                                        <tr key={carline.id} className="hover:bg-gray-50/60 transition-colors group">
                                            <td className="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500 font-medium tabular-nums border-r border-gray-100">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 text-[#1D6F42] text-xs font-medium border border-green-100">
                                                    {carline.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link
                                                        href={route("carline.edit", carline.id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-colors"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(carline.id, carline.code)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                        disabled={isProcessing}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-16 text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-800 mb-1">No carlines found</h3>
                                            <p className="text-sm text-gray-500">
                                                {searchTerm ? `No match for "${searchTerm}"` : 'No carline data yet'}
                                            </p>
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm("")}
                                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                    Clear search
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    {processedCarlines.length > 0 && (
                        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#1D6F42] rounded-full animate-pulse" />
                                Showing {processedCarlines.length} carline{processedCarlines.length !== 1 ? 's' : ''}
                                {totalData > processedCarlines.length && (
                                    <span className="text-gray-400">(filtered from {totalData})</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Carline Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl w-[400px] shadow-xl">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Add New Carline
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Enter the car line code
                                </p>
                            </div>
                            
                            <form onSubmit={handleAddCarline}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Code <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.code}
                                            onChange={(e) => setData("code", e.target.value.toUpperCase())}
                                            placeholder="e.g., 495D, 564D, J72A"
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                            autoFocus
                                            required
                                        />
                                        {addErrors.code && (
                                            <p className="text-red-500 text-sm mt-1">{addErrors.code}</p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            reset();
                                        }}
                                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addProcessing}
                                        className="px-4 py-2 bg-[#1D6F42] text-white rounded-lg text-sm font-medium hover:bg-[#185c38] transition-colors disabled:opacity-50"
                                    >
                                        {addProcessing ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteTarget && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
                            <h3 className="text-lg font-semibold mb-2 text-gray-900">
                                Delete Carline
                            </h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to delete <b>{deleteTarget.code}</b>?
                                <br />
                                <span className="text-xs text-red-500 mt-1 block">
                                    Warning: This action cannot be undone.
                                </span>
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                                    disabled={isProcessing}
                                >
                                    {isProcessing ? "Deleting..." : "Delete"}
                                </button>
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