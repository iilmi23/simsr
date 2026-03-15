import AdminLayout from '@/Layouts/AdminLayout';

export default function Dashboard() {
    return (
        <AdminLayout title="Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stat Cards */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm">Total Shipments</h3>
                    <p className="text-2xl font-bold text-gray-800 mt-2">156</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm">Active Vessels</h3>
                    <p className="text-2xl font-bold text-gray-800 mt-2">24</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm">Pending Releases</h3>
                    <p className="text-2xl font-bold text-gray-800 mt-2">8</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm">Completed Today</h3>
                    <p className="text-2xl font-bold text-gray-800 mt-2">43</p>
                </div>
            </div>
        </AdminLayout>
    );
}