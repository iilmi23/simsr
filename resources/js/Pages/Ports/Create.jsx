import AdminLayout from "@/Layouts/AdminLayout";
import { Link, useForm } from "@inertiajs/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export default function Create({ customer }) {

    const { data, setData, post, processing, errors } = useForm({
        name: "",
        description: ""
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

                <div className="bg-white rounded-2xl border shadow-sm max-w-2xl">

                    <div className="p-6 pb-3">
                        <h1 className="text-2xl font-semibold">
                            Add Port
                        </h1>
                    </div>

                    <form onSubmit={submit} className="px-6 pb-6 space-y-5">

                        <div>
                            <label className="text-sm font-semibold">Port Name *</label>

                            <input
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                className="w-full h-11 px-3 border rounded-xl mt-1"
                            />

                            {errors.name && (
                                <p className="text-red-500 text-sm">{errors.name}</p>
                            )}

                        </div>

                        <div>
                            <label className="text-sm font-semibold">Description</label>

                            <textarea
                                rows="4"
                                value={data.description}
                                onChange={(e) => setData("description", e.target.value)}
                                className="w-full border rounded-xl mt-1 p-2"
                            />

                        </div>

                        <div className="flex justify-end gap-3">

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