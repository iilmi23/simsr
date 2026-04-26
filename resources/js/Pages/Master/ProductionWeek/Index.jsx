import { Link, router, useForm } from "@inertiajs/react";
import { useEffect, useState, useMemo, useRef } from "react";
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    CalendarDaysIcon,
    ChevronRightIcon,
    ArrowUpTrayIcon,
    ArrowDownTrayIcon,
    FunnelIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ChevronUpDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon as ChevronNext,
} from "@heroicons/react/24/outline";
import AdminLayout from "@/Layouts/AdminLayout";

const MONTH_ORDER = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

// Warna utama yang konsisten
const COLORS = {
    primary: "#0F3B2C",    // hijau tua premium
    primaryLight: "#1E5A44",
    primarySoft: "#E6F4EA",
    accent: "#D97706",      // aksen emas/oranye
    accentSoft: "#FEF3C7",
    gray: {
        50: "#F9FAFB",
        100: "#F3F4F6",
        200: "#E5E7EB",
        300: "#D1D5DB",
        400: "#9CA3AF",
        500: "#6B7280",
        600: "#4B5563",
        700: "#374151",
        800: "#1F2937",
        900: "#111827",
    }
};

export default function Index({ productionWeeks, customers, availableYears, filters, flash }) {
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "year", direction: "desc" });
    const [filterOpen, setFilterOpen] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showEtdMapping, setShowEtdMapping] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(filters?.customer_id ?? "");
    const [selectedYear, setSelectedYear] = useState(filters?.year ?? "");
    const [selectedMappingCustomer, setSelectedMappingCustomer] = useState("");
    const [mappings, setMappings] = useState([]);
    const [loadingMappings, setLoadingMappings] = useState(false);
    const fileRef = useRef();

    const { data, setData, post, processing, errors, reset } = useForm({
        file: null,
        customer_id: "",
    });

    const weekList = productionWeeks?.data ?? [];

    useEffect(() => {
        if (flash?.success || flash?.error) {
            setAlertType(flash?.success ? "success" : "error");
            setShowAlert(true);
            const t = setTimeout(() => setShowAlert(false), 4000);
            return () => clearTimeout(t);
        }
    }, [flash]);

    const applyFilter = () => {
        router.get(route("production-week.index"), {
            customer_id: selectedCustomer,
            year: selectedYear,
        }, { preserveState: true, replace: true });
    };

    const clearFilter = () => {
        setSelectedCustomer("");
        setSelectedYear("");
        router.get(route("production-week.index"), {}, { preserveState: true, replace: true });
    };

    const handleRegenerate = () => {
        if (!selectedCustomer) {
            alert("Pilih customer terlebih dahulu");
            return;
        }
        if (confirm("Generate ulang weeks dari data SR yang ada?")) {
            router.post(route("production-week.regenerate"), { customer_id: selectedCustomer }, {
                onSuccess: () => router.reload()
            });
        }
    };

    const loadEtdMappings = () => {
        if (!selectedMappingCustomer) return;
        setLoadingMappings(true);
        router.get(`/etd-mapping/${selectedMappingCustomer}`, {}, {
            onSuccess: (page) => {
                setMappings(page.props.mappings || []);
                setLoadingMappings(false);
            },
            onError: () => setLoadingMappings(false)
        });
    };

    const updateMapping = (mappingId, weekId) => {
        router.put(`/etd-mapping/${mappingId}`, { production_week_id: weekId }, {
            onSuccess: () => loadEtdMappings()
        });
    };

    const handleSort = (key) => {
        setSortConfig(cur => ({
            key,
            direction: cur.key === key && cur.direction === "asc" ? "desc" : "asc",
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
        return sortConfig.direction === "asc"
            ? <ArrowUpIcon className="w-4 h-4" style={{ color: COLORS.primary }} />
            : <ArrowDownIcon className="w-4 h-4" style={{ color: COLORS.primary }} />;
    };

    const sorted = useMemo(() => {
        const filtered = weekList.filter(w =>
            (w.customer?.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (w.customer?.code ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (w.month_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(w.year).includes(searchTerm)
        );
        return [...filtered].sort((a, b) => {
            let av = a[sortConfig.key] ?? "";
            let bv = b[sortConfig.key] ?? "";
            const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
            return sortConfig.direction === "asc" ? cmp : -cmp;
        });
    }, [weekList, searchTerm, sortConfig]);

    const handleDelete = (id, label) => {
        if (confirm(`Hapus "${label}"?`)) {
            router.delete(route("production-week.destroy", id));
        }
    };

    const handleImport = (e) => {
        e.preventDefault();
        post(route("production-week.import"), {
            onSuccess: () => { setShowImport(false); reset(); },
        });
    };

    const meta = productionWeeks;

    const monthColor = (name) => {
        const idx = MONTH_ORDER.indexOf(name);
        if (idx === -1) return "bg-gray-100 text-gray-600";
        const colors = [
            "bg-blue-50 text-blue-700",
            "bg-emerald-50 text-emerald-700",
            "bg-amber-50 text-amber-700",
            "bg-purple-50 text-purple-700"
        ];
        return colors[Math.floor(idx / 3)] ?? "bg-gray-100 text-gray-600";
    };

    // Komponen Modal untuk ETD Mapping (dipisahkan agar lebih rapi)
    const EtdMappingModal = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEtdMapping(false)}>
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">ETD Mapping Settings</h2>
                        <p className="text-sm text-gray-500 mt-1">Atur mapping tanggal ETD ke week untuk setiap customer</p>
                    </div>
                    <button onClick={() => setShowEtdMapping(false)} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="flex gap-3 mb-6">
                        <select 
                            value={selectedMappingCustomer} 
                            onChange={(e) => setSelectedMappingCustomer(e.target.value)}
                            className="flex-1 h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Pilih Customer</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                        </select>
                        <button 
                            onClick={loadEtdMappings} 
                            className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                            Load Data
                        </button>
                    </div>
                    
                    {loadingMappings && (
                        <div className="text-center py-12">
                            <div className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                            <p className="mt-3 text-gray-500">Memuat data...</p>
                        </div>
                    )}
                    
                    {!loadingMappings && mappings.length > 0 && (
                        <div className="overflow-x-auto max-h-96 border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="p-3 text-left font-semibold text-gray-600">ETD Date</th>
                                        <th className="p-3 text-left font-semibold text-gray-600">Current Week</th>
                                        <th className="p-3 text-left font-semibold text-gray-600">Status</th>
                                        <th className="p-3 text-left font-semibold text-gray-600">Change to</th>
                                        <th className="p-3 text-center font-semibold text-gray-600">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {mappings.map((mapping) => (
                                        <tr key={mapping.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-mono text-gray-700">{mapping.etd_date}</td>
                                            <td className="p-3">
                                                <span className="text-gray-700">{mapping.week_label}</span>
                                                {mapping.is_edited && <span className="ml-2 text-xs text-amber-600">(Edited)</span>}
                                            </td>
                                            <td className="p-3">
                                                {mapping.is_edited ? 
                                                    <span className="inline-flex items-center gap-1 text-emerald-600"><span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>Manual</span> : 
                                                    <span className="inline-flex items-center gap-1 text-gray-400"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>Auto</span>
                                                }
                                            </td>
                                            <td className="p-3">
                                                <select 
                                                    defaultValue={mapping.production_week_id}
                                                    onChange={(e) => updateMapping(mapping.id, e.target.value)}
                                                    className="border border-gray-300 rounded-lg p-2 text-sm w-48 focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    {mapping.available_weeks?.map(week => (
                                                        <option key={week.id} value={week.id}>{week.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3 text-center">
                                                <button 
                                                    onClick={() => updateMapping(mapping.id, mapping.production_week_id)} 
                                                    className="text-emerald-600 text-sm font-medium hover:text-emerald-700"
                                                >
                                                    Apply
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    
                    {!loadingMappings && mappings.length === 0 && selectedMappingCustomer && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Belum ada ETD mapping untuk customer ini</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50 p-6 font-sans">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-5 text-sm">
                    <span className="text-gray-500">Dashboard</span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-800">Production Weeks</span>
                </div>

                {/* Alert Notifikasi */}
                {showAlert && (
                    <div className="mb-5 animate-slideDown">
                        <div className={`flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                            alertType === "success" ? "border-l-emerald-500" : "border-l-red-500"
                        }`}>
                            <div className={`p-2 rounded-lg ${
                                alertType === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            }`}>
                                {alertType === "success"
                                    ? <CheckCircleIcon className="w-5 h-5" />
                                    : <ExclamationCircleIcon className="w-5 h-5" />}
                            </div>
                            <p className="flex-1 text-sm text-gray-800">{flash?.success || flash?.error}</p>
                            <button onClick={() => setShowAlert(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal Import */}
                {showImport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImport(false)}>
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b">
                                <h2 className="text-lg font-semibold text-gray-900">Import dari Excel</h2>
                                <button onClick={() => setShowImport(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleImport} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer *</label>
                                    <select
                                        value={data.customer_id}
                                        onChange={e => setData("customer_id", e.target.value)}
                                        className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="">Pilih customer...</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                    {errors.customer_id && <p className="mt-1 text-xs text-red-500">{errors.customer_id}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">File Excel (.xlsx) *</label>
                                    <div
                                        onClick={() => fileRef.current?.click()}
                                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                            data.file ? "border-emerald-500 bg-emerald-50" : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"
                                        }`}
                                    >
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                            onChange={e => setData("file", e.target.files[0])}
                                        />
                                        <ArrowUpTrayIcon className={`w-8 h-8 mx-auto mb-2 ${data.file ? "text-emerald-600" : "text-gray-400"}`} />
                                        {data.file ? (
                                            <p className="text-sm font-medium text-emerald-600">{data.file.name}</p>
                                        ) : (
                                            <>
                                                <p className="text-sm font-medium text-gray-700">Klik untuk pilih file</p>
                                                <p className="text-xs text-gray-400 mt-1">.xlsx atau .xls, maks 5MB</p>
                                            </>
                                        )}
                                    </div>
                                    {errors.file && <p className="mt-1 text-xs text-red-500">{errors.file}</p>}
                                </div>

                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-xs font-medium text-blue-800 mb-1">Format kolom yang dibutuhkan:</p>
                                    <p className="text-xs text-blue-600">A: Bulan (JAN), B: Range tanggal, C: Tahun, D: Jumlah Minggu</p>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <a href={route("production-week.download-template")} className="text-sm text-gray-600 hover:text-emerald-600 transition-colors">
                                        ↓ Download template
                                    </a>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={processing || !data.file || !data.customer_id}
                                            className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                        >
                                            {processing ? "Mengimpor..." : "Import"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ETD Mapping Modal */}
                {showEtdMapping && <EtdMappingModal />}

                {/* Main Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header dengan aksi utama */}
                    <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Production Weeks</h1>
                            <p className="text-sm text-gray-500 mt-1">Kelola kalender produksi per customer</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowEtdMapping(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
                            >
                                <span>📌</span> ETD Mapping
                            </button>
                            <button
                                onClick={handleRegenerate}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <span>🔄</span> Regenerate
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    className="w-full h-10 pl-10 pr-10 border border-gray-300 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="Cari customer, bulan, tahun..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilterOpen(!filterOpen)}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                                        filterOpen || filters?.customer_id || filters?.year
                                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <FunnelIcon className="w-4 h-4" />
                                    Filter
                                </button>
                                <button
                                    onClick={() => setShowImport(true)}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                    Import
                                </button>
                                <Link
                                    href={route("production-week.create")}
                                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Tambah
                                </Link>
                            </div>
                        </div>

                        {/* Filter Panel */}
                        {filterOpen && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="flex flex-wrap gap-3 items-end">
                                    <div className="flex-1 min-w-[180px]">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
                                        <select
                                            value={selectedCustomer}
                                            onChange={e => setSelectedCustomer(e.target.value)}
                                            className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="">Semua customer</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="min-w-[120px]">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
                                        <select
                                            value={selectedYear}
                                            onChange={e => setSelectedYear(e.target.value)}
                                            className="w-full h-9 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                        >
                                            <option value="">Semua tahun</option>
                                            {availableYears?.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={applyFilter} className="px-4 h-9 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
                                            Terapkan
                                        </button>
                                        <button onClick={clearFilter} className="px-4 h-9 bg-white text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600" onClick={() => handleSort("customer")}>
                                        <div className="flex items-center gap-1">Customer {getSortIcon("customer")}</div>
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 w-24" onClick={() => handleSort("year")}>
                                        <div className="flex items-center gap-1">Tahun {getSortIcon("year")}</div>
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-emerald-600 w-28" onClick={() => handleSort("month_name")}>
                                        <div className="flex items-center gap-1">Bulan {getSortIcon("month_name")}</div>
                                    </th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Week</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mulai</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Jml Minggu</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sorted.length > 0 ? sorted.map((w, i) => (
                                    <tr key={w.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-5 py-3 text-sm text-gray-400">{String(i + 1).padStart(2, "0")}</td>
                                        <td className="px-5 py-3">
                                            <div className="font-medium text-gray-900">{w.customer?.name ?? "—"}</div>
                                            <div className="text-xs text-gray-400 font-mono mt-0.5">{w.customer?.code}</div>
                                        </td>
                                        <td className="px-5 py-3 text-sm font-mono text-gray-700">{w.year}</td>
                                        <td className="px-5 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${monthColor(w.month_name)}`}>
                                                {w.month_name}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                                                {w.week_no}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-gray-600 font-mono whitespace-nowrap">
                                            {w.week_start
                                                ? new Date(w.week_start).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                                                : "—"}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1">
                                                {[...Array(w.num_weeks || 4)].map((_, n) => (
                                                    <span key={n} className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                                                        {n + 1}
                                                    </span>
                                                ))}
                                                <span className="text-xs text-gray-400 ml-1">({w.num_weeks || 4})</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={route("production-week.edit", w.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
                                                >
                                                    <PencilIcon className="w-3.5 h-3.5" />
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(w.id, `${w.month_name} ${w.year} W${w.week_no}`)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                                                <CalendarDaysIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <p className="text-base font-semibold text-gray-700">Belum ada data</p>
                                            <p className="text-sm text-gray-400 mt-1">
                                                {searchTerm ? `Tidak ada hasil untuk "${searchTerm}"` : "Tambah production week atau import dari Excel"}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {sorted.length > 0 && meta?.last_page > 1 && (
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm text-gray-500">
                                Menampilkan {sorted.length} dari {meta?.total ?? sorted.length} data
                            </div>
                            <div className="flex gap-1">
                                <Link
                                    href={meta?.prev_page_url ?? "#"}
                                    className={`p-2 rounded-lg border text-sm transition-colors ${
                                        meta?.current_page === 1
                                            ? "opacity-40 pointer-events-none border-gray-200 text-gray-400"
                                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </Link>
                                {meta?.links?.filter(l => !["&laquo; Previous","Next &raquo;"].includes(l.label)).map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url ?? "#"}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                            link.active
                                                ? "bg-emerald-600 text-white"
                                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                                <Link
                                    href={meta?.next_page_url ?? "#"}
                                    className={`p-2 rounded-lg border text-sm transition-colors ${
                                        meta?.current_page === meta?.last_page
                                            ? "opacity-40 pointer-events-none border-gray-200 text-gray-400"
                                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    <ChevronNext className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown { animation: slideDown 0.25s ease-out; }
            `}</style>
        </AdminLayout>
    );
}