import AdminLayout from "@/Layouts/AdminLayout";
import { Link, router } from "@inertiajs/react";
import { useState, useMemo } from "react";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    ChevronRightIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from "@heroicons/react/24/outline";

export default function Index({ customer, ports }) {

    const [search, setSearch] = useState("");
    const [sortDir, setSortDir] = useState("asc");
    const [deletePort, setDeletePort] = useState(null);

    const processedPorts = useMemo(() => {

        let filtered = ports.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description || "").toLowerCase().includes(search.toLowerCase())
        );

        filtered.sort((a, b) => {
            const comp = a.name.localeCompare(b.name);
            return sortDir === "asc" ? comp : -comp;
        });

        return filtered;

    }, [ports, search, sortDir]);

    const confirmDelete = () => {
        router.delete(`/customers/${customer.id}/ports/${deletePort.id}`);
    };

    return (
        <AdminLayout>

            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-4 text-sm">

                    <Link href="/customers" className="text-gray-600 hover:text-[#1D6F42]">
                        Customers
                    </Link>

                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />

                    <span className="text-gray-700">
                        {customer.name} Ports
                    </span>

                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">

                    {/* Header */}
                    <div className="p-6 flex justify-between items-center">

                        <div>
                            <h1 className="text-2xl font-semibold">
                                Ports
                            </h1>

                            <p className="text-sm text-gray-500">
                                Customer: {customer.name}
                            </p>
                        </div>

                        <Link
                            href={`/customers/${customer.id}/ports/create`}
                            className="inline-flex items-center gap-2 h-11 px-5 bg-[#1D6F42] text-white rounded-xl hover:bg-[#185c38]"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Port
                        </Link>

                    </div>

                    {/* Search + Sort */}
                    <div className="px-6 pb-4 flex gap-3">

                        <div className="relative flex-1">

                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3" />

                            <input
                                type="text"
                                placeholder="Search ports..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-xl text-sm"
                            />

                        </div>

                        <button
                            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                            className="px-4 border rounded-xl flex items-center gap-1 text-sm"
                        >
                            Sort
                            {sortDir === "asc"
                                ? <ArrowUpIcon className="w-4" />
                                : <ArrowDownIcon className="w-4" />}
                        </button>

                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">

                        <table className="w-full">

                            <thead>
                                <tr className="bg-gray-100 border-b text-xs uppercase text-gray-600">

                                    <th className="px-6 py-3 text-left">#</th>
                                    <th className="px-6 py-3 text-left">Port</th>
                                    <th className="px-6 py-3 text-left">Description</th>
                                    <th className="px-6 py-3 text-left">Actions</th>

                                </tr>
                            </thead>

                            <tbody className="divide-y">

                                {processedPorts.map((port, index) => (
                                    <tr key={port.id} className="hover:bg-gray-50">

                                        <td className="px-6 py-4">{index + 1}</td>

                                        <td className="px-6 py-4 font-medium">
                                            {port.name}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600">
                                            {port.description || "-"}
                                        </td>

                                        <td className="px-6 py-4 flex gap-2">

                                            <Link
                                                href={`/customers/${customer.id}/ports/${port.id}/edit`}
                                                className="flex items-center gap-1 border px-3 py-1.5 rounded-lg text-sm"
                                            >
                                                <PencilIcon className="w-4" />
                                                Edit
                                            </Link>

                                            <button
                                                onClick={() => setDeletePort(port)}
                                                className="flex items-center gap-1 border border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-sm"
                                            >
                                                <TrashIcon className="w-4" />
                                                Delete
                                            </button>

                                        </td>

                                    </tr>
                                ))}

                            </tbody>

                        </table>

                    </div>

                </div>

                {/* Delete Modal */}
                {deletePort && (

                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">

                        <div className="bg-white p-6 rounded-xl w-96">

                            <h3 className="text-lg font-semibold mb-2">
                                Delete Port
                            </h3>

                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to delete <b>{deletePort.name}</b> ?
                            </p>

                            <div className="flex justify-end gap-3">

                                <button
                                    onClick={() => setDeletePort(null)}
                                    className="px-4 py-2 border rounded-lg"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    </div>

                )}

            </div>

        </AdminLayout>
    );
}