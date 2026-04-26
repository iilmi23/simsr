import AdminLayout from "@/Layouts/AdminLayout";
import { Link, useForm } from "@inertiajs/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export default function Edit({ customer, port }) {

    const { data, setData, put, processing, errors } = useForm({
        name: port.name,
        description: port.description || ""
    });

    const submit = (e) => {
        e.preventDefault();
        put(`/customers/${customer.id}/ports/${port.id}`);
    };

    return (
        <AdminLayout>

            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                    <Link href="/customers" className="text-gray-600 hover:text-[#1D6F42] transition-colors">
                        Customers
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <Link
                        href={`/customers/${customer.id}/ports`}
                        className="text-gray-600 hover:text-[#1D6F42] transition-colors"
                    >
                        Ports
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-800 font-medium">Edit</span>
                </div>

                {/* Card - Full Width */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                            Edit Port
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Update port details for {customer.name}.
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-6">
                        <form onSubmit={submit} className="space-y-6">

                            {/* Port Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Port Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    placeholder="Enter port name"
                                    className={`w-full h-11 px-4 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] ${
                                        errors.name ? "border-red-400" : "border-gray-200"
                                    }`}
                                    autoFocus
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows="4"
                                    value={data.description}
                                    onChange={(e) => setData("description", e.target.value)}
                                    placeholder="Enter description"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Link
                                    href={`/customers/${customer.id}/ports`}
                                    className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                                >
                                    Back
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition disabled:opacity-50"
                                >
                                    {processing ? "Updating..." : "Update Port"}
                                </button>
                            </div>

                        </form>
                    </div>

                </div>

            </div>

        </AdminLayout>
    );
}