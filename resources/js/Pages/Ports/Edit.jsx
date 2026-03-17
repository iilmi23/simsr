import AdminLayout from "@/Layouts/AdminLayout";
import { Link, useForm } from "@inertiajs/react";

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

            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8">

                <div className="bg-white rounded-2xl border shadow-sm max-w-2xl">

                    <div className="p-6 pb-3">
                        <h1 className="text-2xl font-semibold">
                            Edit Port
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
                                Update Port
                            </button>

                        </div>

                    </form>

                </div>

            </div>

        </AdminLayout>
    );
}