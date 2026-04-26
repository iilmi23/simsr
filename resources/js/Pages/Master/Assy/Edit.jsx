import AdminLayout from "@/Layouts/AdminLayout";
import { Link, useForm } from "@inertiajs/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export default function Edit({ assy, carLines }) {
    const { data, setData, put, processing, errors } = useForm({
        carline_id: assy.carline_id.toString(),
        part_number: assy.part_number,
        sap_id: assy.sap_id || "",
        assy_code: assy.assy_code,
        level: assy.level,
        market: assy.market || "",
        drive_side: assy.drive_side || "",
        umh_gum: assy.umh_gum.toString(),
        umh_ocs: assy.umh_ocs?.toString() || "",
        std_pack: assy.std_pack.toString(),
        cct: assy.cct?.toString() || "",
        project_code: assy.project_code || "",
        model_code: assy.model_code || "",
        rank: assy.rank || "",
        is_active: assy.is_active,
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/master/assy/${assy.id}`);
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <span className="text-gray-600 hover:text-[#1D6F42] transition-colors cursor-pointer">Menu</span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <Link href="/master/assy" className="text-gray-600 hover:text-[#1D6F42] transition-colors">
                        Assy Master
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 font-medium">Edit: {assy.part_number}</span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                            Edit Assy Master
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Update part/assy information for {assy.part_number}
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-6">
                        <form onSubmit={submit} className="space-y-6">

                            {/* Two Column Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Car Line */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Car Line <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.carline_id}
                                        onChange={(e) => setData("carline_id", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] bg-white"
                                    >
                                        <option value="">Select Car Line</option>
                                        {carLines.map((carLine) => (
                                            <option key={carLine.id} value={carLine.id}>
                                                {carLine.code} - {carLine.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.carline_id && (
                                        <p className="text-red-500 text-sm mt-1">{errors.carline_id}</p>
                                    )}
                                </div>

                                {/* Part Number */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Part Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.part_number}
                                        onChange={(e) => setData("part_number", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 text-gray-500 focus:outline-none cursor-not-allowed"
                                        readOnly
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Part number cannot be changed</p>
                                    {errors.part_number && (
                                        <p className="text-red-500 text-sm mt-1">{errors.part_number}</p>
                                    )}
                                </div>

                                {/* SAP ID */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        SAP ID
                                    </label>
                                    <input
                                        type="text"
                                        value={data.sap_id}
                                        onChange={(e) => setData("sap_id", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                </div>

                                {/* Assy Code */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Assy Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.assy_code}
                                        onChange={(e) => setData("assy_code", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.assy_code && (
                                        <p className="text-red-500 text-sm mt-1">{errors.assy_code}</p>
                                    )}
                                </div>

                                {/* Level */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Level <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.level}
                                        onChange={(e) => setData("level", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.level && (
                                        <p className="text-red-500 text-sm mt-1">{errors.level}</p>
                                    )}
                                </div>

                                {/* Market & Drive Side */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Market
                                        </label>
                                        <select
                                            value={data.market}
                                            onChange={(e) => setData("market", e.target.value)}
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] bg-white"
                                        >
                                            <option value="">Select Market</option>
                                            <option value="GAS">GAS</option>
                                            <option value="HEV">HEV</option>
                                            <option value="HV">HV</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                                            Drive Side
                                        </label>
                                        <select
                                            value={data.drive_side}
                                            onChange={(e) => setData("drive_side", e.target.value)}
                                            className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] bg-white"
                                        >
                                            <option value="">Select Drive Side</option>
                                            <option value="LHD">LHD</option>
                                            <option value="RHD">RHD</option>
                                        </select>
                                    </div>
                                </div>

                                {/* UMH GUM */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        UMH GUM <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={data.umh_gum}
                                        onChange={(e) => setData("umh_gum", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.umh_gum && (
                                        <p className="text-red-500 text-sm mt-1">{errors.umh_gum}</p>
                                    )}
                                </div>

                                {/* UMH OCS */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        UMH OCS
                                    </label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={data.umh_ocs}
                                        onChange={(e) => setData("umh_ocs", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                </div>

                                {/* Std Pack */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Std Pack <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.std_pack}
                                        onChange={(e) => setData("std_pack", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.std_pack && (
                                        <p className="text-red-500 text-sm mt-1">{errors.std_pack}</p>
                                    )}
                                </div>

                                {/* CCT */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        CCT
                                    </label>
                                    <input
                                        type="number"
                                        value={data.cct}
                                        onChange={(e) => setData("cct", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                </div>

                                {/* Project Code */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Project Code
                                    </label>
                                    <input
                                        type="text"
                                        value={data.project_code}
                                        onChange={(e) => setData("project_code", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                </div>

                                {/* Model Code */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Model Code
                                    </label>
                                    <input
                                        type="text"
                                        value={data.model_code}
                                        onChange={(e) => setData("model_code", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                </div>

                                {/* Rank */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Rank
                                    </label>
                                    <input
                                        type="text"
                                        value={data.rank}
                                        onChange={(e) => setData("rank", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <div className="flex items-center gap-4 h-11">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={data.is_active === true}
                                                onChange={() => setData("is_active", true)}
                                                className="w-4 h-4 text-[#1D6F42]"
                                            />
                                            <span className="text-sm">Active</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={data.is_active === false}
                                                onChange={() => setData("is_active", false)}
                                                className="w-4 h-4 text-gray-400"
                                            />
                                            <span className="text-sm">Inactive</span>
                                        </label>
                                    </div>
                                </div>

                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Link
                                    href="/master/assy"
                                    className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition disabled:opacity-50"
                                >
                                    {processing ? "Updating..." : "Update Assy Master"}
                                </button>
                            </div>

                        </form>
                    </div>

                </div>

            </div>
        </AdminLayout>
    );
}