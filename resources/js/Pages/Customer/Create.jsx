import AdminLayout from "@/Layouts/AdminLayout";
import { Link, useForm } from "@inertiajs/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        code: "",
        keterangan: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post("/customers");
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <span className="text-gray-600 hover:text-[#1D6F42] transition-colors cursor-pointer">Menu</span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <Link href="/customers" className="text-gray-600 hover:text-[#1D6F42] transition-colors">
                        Customers
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 font-medium">
                        Create
                    </span>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-3xl">

                    {/* Header */}
                    <div className="p-6 pb-3">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                            Add Customer
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Create a new customer record
                        </p>
                    </div>

                    {/* Form */}
                    <div className="px-6 pb-6">
                        <form onSubmit={submit} className="space-y-5">

                            {/* Customer Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Customer Name <span className="text-red-500">*</span>
                                </label>

                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    placeholder="Enter customer name"
                                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    autoFocus
                                />

                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                                )}
                            </div>

                            {/* Customer Code */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Customer Code
                                </label>

                                <input
                                    type="text"
                                    value={data.code}
                                    onChange={(e) => setData("code", e.target.value)}
                                    placeholder="Enter customer code"
                                    className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Description
                                </label>

                                <textarea
                                    value={data.keterangan}
                                    onChange={(e) => setData("keterangan", e.target.value)}
                                    placeholder="Enter description"
                                    rows="4"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2">

                                <Link
                                    href="/customers"
                                    className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                                >
                                    Back
                                </Link>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition disabled:opacity-50"
                                >
                                    {processing ? "Saving..." : "Save Customer"}
                                </button>

                            </div>

                        </form>
                    </div>

                </div>

            </div>
        </AdminLayout>
    );
}