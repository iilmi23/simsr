import AdminLayout from '@/Layouts/AdminLayout';
import { FaShip, FaClock, FaCheckCircle, FaUsers, FaAnchor, FaRoute } from 'react-icons/fa';
import { useMemo } from 'react';

export default function Dashboard() {
  // Data mentah, bisa dari API atau props
  const shipments = [
    { status: 'Total Customers', count: 156 },
    { status: 'Total Ports', count: 24 },
    { status: 'Total SR', count: 8 },
    { status: 'Completed', count: 43 },
  ];

  // Gunakan useMemo untuk menghitung stats otomatis
  const stats = useMemo(() => [
    {
      title: "Total Customers",
      value: shipments.find(s => s.status === 'Total Customers')?.count || 0,
      icon: <FaUsers />,
      color: "border-orange-400",
    },
    {
      title: "Total Ports",
      value: shipments.find(s => s.status === 'Total Ports')?.count || 0,
      icon: <FaAnchor />,
      color: "border-blue-400",
    },
    {
      title: "Total Car Line",
      value: 0, // Default value jika tidak ada data
      icon: <FaRoute />,
      color: "border-yellow-500",
    },
    {
      title: "Total SR",
      value: shipments.find(s => s.status === 'Total SR')?.count || 0,
      icon: <FaCheckCircle />,
      color: "border-emerald-600",
    },
  ], [shipments]);

  return (
    <AdminLayout title="Dashboard">
      {/* Tambahkan container dengan padding kiri untuk menghindari dempet ke sidebar */}
      <div className="pl-6 pr-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`bg-white border-l-4 ${stat.color} rounded-xl shadow p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{stat.title}</p>
                  <h2 className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                </div>
                <div className="text-3xl text-gray-300">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}