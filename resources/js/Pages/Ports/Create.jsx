import AdminLayout from "@/Layouts/AdminLayout";
import { Link, useForm } from "@inertiajs/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export default function Create({ customer }) {

    const { data, setData, post, processing, errors } = useForm({
        name: "",
        keterangan: ""
    });

    const submit = (e) => {
        e.preventDefault();
        post(`/customers/${customer.id}/ports`);
    }

    return (
        <AdminLayout>

            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 text-sm">

                    <Link href="/customers" className="text-gray-600 hover:text-[#1D6F42]">
                        Customers
                    </Link>

                    <ChevronRightIcon className="w-4 text-gray-400" />

                    <Link
                        href={`/customers/${customer.id}/ports`}
                        className="text-gray-600 hover:text-[#1D6F42]">
                        Ports
                    </Link>

                    <ChevronRightIcon className="w-4 text-gray-400" />

                    <span>Create</span>

                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="p-6 pb-4 border-b border-gray-100">
                        <h1 className="text-2xl font-semibold text-gray-900">Add Port</h1>
                        <p className="text-sm text-gray-500 mt-1">Add a new port for {customer.name}.</p>
                    </div>

                    <form onSubmit={submit} className="p-6 space-y-6">

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Port Name <span className="text-red-500">*</span></label>
                            <input
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm mt-2">{errors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                            <textarea
                                rows="4"
                                value={data.keterangan}
                                onChange={(e) => setData("keterangan", e.target.value)}
                                placeholder="Enter description"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3">

                            <Link
                                href={`/customers/${customer.id}/ports`}
                                className="border px-5 h-11 flex items-center rounded-xl"
                            >
                                Back
                            </Link>

                            <button
                                disabled={processing}
                                className="bg-[#1D6F42] text-white px-5 h-11 rounded-xl"
                            >
                                Save Port
                            </button>

                        </div>

                    </form>

                </div>

            </div>

        </AdminLayout>
    )
}