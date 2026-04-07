import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function Logs({ logs, logFile }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Debug Logs
                </h2>
            }
        >
            <Head title="Debug Logs" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="mb-4">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Recent Application Logs
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Log file: <code className="bg-gray-100 px-2 py-1 rounded">{logFile}</code>
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    Showing last 50 log entries (newest first)
                                </p>
                            </div>

                            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
                                {logs && logs.length > 0 ? (
                                    logs.map((log, index) => (
                                        <div key={index} className="mb-1 whitespace-pre-wrap">
                                            {log.trim()}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-400">
                                        No logs found or log file doesn't exist yet.
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 text-sm text-gray-600">
                                <p><strong>Troubleshooting Tips:</strong></p>
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                    <li>Check for "YNAMapper Error" or "Mapping failed" messages</li>
                                    <li>Look for "Upload failed" or "Database insertion failed" entries</li>
                                    <li>Verify Excel file format matches expected headers</li>
                                    <li>Ensure customer and port selections are correct</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}