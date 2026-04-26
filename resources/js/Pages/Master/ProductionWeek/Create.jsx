import AdminLayout from "@/Layouts/AdminLayout";
import { Link, useForm } from "@inertiajs/react";
import { ChevronRightIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";

const MONTH_MAP = {
    1:"JAN",2:"FEB",3:"MAR",4:"APR",5:"MAY",6:"JUN",
    7:"JUL",8:"AUG",9:"SEP",10:"OCT",11:"NOV",12:"DEC",
};

export default function Create({ customers, monthNames }) {
    const { data, setData, post, processing, errors } = useForm({
        customer_id: "",
        year: new Date().getFullYear(),
        month_number: "",
        month_name: "",
        week_no: "",
        week_start: "",
        num_weeks: 4,
    });

    // Sync month_name otomatis saat month_number berubah
    const handleMonthChange = (val) => {
        const num = parseInt(val);
        setData(prev => ({
            ...prev,
            month_number: val,
            month_name: MONTH_MAP[num] ?? "",
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route("production-weeks.store"));
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-6 text-sm">
                    <span className="text-gray-500">Menu</span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <Link href={route("production-weeks.index")} className="text-gray-500 hover:text-[#1D6F42]">
                        Production Weeks
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 font-medium">Tambah Baru</span>
                </div>

                <div className="max-w-2xl">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 p-6 border-b border-gray-100">
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                                <CalendarDaysIcon className="w-5 h-5 text-[#1D6F42]" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">Tambah Production Week</h1>
                                <p className="text-xs text-gray-500">Input satu baris kalender produksi JAI</p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">

                            {/* Customer */}
                            <FormField label="Customer" required error={errors.customer_id}>
                                <select
                                    value={data.customer_id}
                                    onChange={e => setData("customer_id", e.target.value)}
                                    className={inputCls(errors.customer_id)}
                                >
                                    <option value="">Pilih customer...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                    ))}
                                </select>
                            </FormField>

                            {/* Year + Month row */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Tahun" required error={errors.year}>
                                    <input
                                        type="number"
                                        min={2020} max={2050}
                                        value={data.year}
                                        onChange={e => setData("year", e.target.value)}
                                        className={inputCls(errors.year)}
                                        placeholder="2026"
                                    />
                                </FormField>

                                <FormField label="Bulan" required error={errors.month_number}>
                                    <select
                                        value={data.month_number}
                                        onChange={e => handleMonthChange(e.target.value)}
                                        className={inputCls(errors.month_number)}
                                    >
                                        <option value="">Pilih bulan...</option>
                                        {Object.entries(MONTH_MAP).map(([num, name]) => (
                                            <option key={num} value={num}>{num} — {name}</option>
                                        ))}
                                    </select>
                                    {/* month_name readonly (auto-filled) */}
                                    {data.month_name && (
                                        <p className="mt-1 text-xs text-gray-400">
                                            Nama bulan: <span className="font-mono font-medium text-[#1D6F42]">{data.month_name}</span>
                                        </p>
                                    )}
                                </FormField>
                            </div>

                            {/* Week No + Num Weeks row */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    label="Week ke-"
                                    required
                                    error={errors.week_no}
                                    hint="Urutan minggu dalam bulan ini (1–6)"
                                >
                                    <div className="flex gap-2">
                                        {[1,2,3,4,5,6].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setData("week_no", n)}
                                                className={`flex-1 h-10 rounded-lg text-sm font-semibold border transition-all ${
                                                    data.week_no === n
                                                        ? "bg-[#1D6F42] text-white border-[#1D6F42]"
                                                        : "bg-white text-gray-600 border-gray-200 hover:border-[#1D6F42]/40"
                                                }`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </FormField>

                                <FormField
                                    label="Jumlah minggu"
                                    required
                                    error={errors.num_weeks}
                                    hint="Biasanya 4 atau 5"
                                >
                                    <div className="flex gap-2">
                                        {[4, 5].map(n => (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setData("num_weeks", n)}
                                                className={`flex-1 h-10 rounded-lg text-sm font-semibold border transition-all ${
                                                    data.num_weeks === n
                                                        ? "bg-[#1D6F42] text-white border-[#1D6F42]"
                                                        : "bg-white text-gray-600 border-gray-200 hover:border-[#1D6F42]/40"
                                                }`}
                                            >
                                                {n} minggu
                                            </button>
                                        ))}
                                    </div>
                                </FormField>
                            </div>

                            {/* Week Start */}
                            <FormField
                                label="Tanggal mulai (week_start)"
                                required
                                error={errors.week_start}
                                hint="Tanggal pertama minggu ini di kalender produksi JAI. Boleh beda bulan — misal Mei Week 1 bisa mulai 29 April."
                            >
                                <input
                                    type="date"
                                    value={data.week_start}
                                    onChange={e => setData("week_start", e.target.value)}
                                    className={inputCls(errors.week_start)}
                                />
                            </FormField>

                            {/* Preview */}
                            {data.customer_id && data.year && data.month_name && data.week_no && data.week_start && (
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                                    <p className="text-xs font-medium text-green-700 mb-2">Preview data</p>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                                        <PreviewRow label="Customer" value={customers.find(c => c.id == data.customer_id)?.name} />
                                        <PreviewRow label="Periode" value={`${data.month_name} ${data.year}`} />
                                        <PreviewRow label="Week ke-" value={`${data.week_no} dari ${data.num_weeks}`} />
                                        <PreviewRow label="Mulai" value={new Date(data.week_start).toLocaleDateString("id-ID", { weekday:"short", day:"2-digit", month:"short", year:"numeric" })} />
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                                <Link
                                    href={route("production-weeks.index")}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Batal
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
                                >
                                    {processing && (
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                                        </svg>
                                    )}
                                    {processing ? "Menyimpan..." : "Simpan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

// ── Helpers ───────────────────────────────────────────────────
const inputCls = (err) =>
    `w-full h-10 px-3 bg-white border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition-all ${
        err
            ? "border-red-300 focus:ring-red-200 focus:border-red-400"
            : "border-gray-200 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
    }`;

function FormField({ label, required, error, hint, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function PreviewRow({ label, value }) {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-green-600">{label}:</span>
            <span className="text-xs font-medium text-green-800">{value ?? "—"}</span>
        </div>
    );
}