<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\SR;
use App\Models\Customer;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\SummaryExport;

class SummaryController extends Controller
{
    // LIST SR dengan filter
    public function index(Request $request)
    {
        $query = SR::query();

        // Filter by customer
        if ($request->filled('customer')) {
            $query->where('customer', $request->customer);
        }

        // Filter by month
        if ($request->filled('month')) {
            $query->where('month', $request->month);
        }

        // Search by SR number or source file
        if ($request->filled('search')) {
            $query->where(function ($subQuery) use ($request) {
                $subQuery->where('sr_number', 'like', '%' . $request->search . '%')
                    ->orWhere('source_file', 'like', '%' . $request->search . '%');
            });
        }

        $srList = $query
            ->selectRaw('MIN(id) as id, sr_number, customer, port, source_file, MIN(created_at) as upload_date, COUNT(*) as total_items, SUM(qty) as total_qty')
            ->groupBy('sr_number', 'customer', 'port', 'source_file')
            ->orderByRaw('MIN(created_at) desc')
            ->get();

        $customers = Customer::orderBy('name')->get(['name', 'code']);

        return Inertia::render('Summary/Index', [
            'srList' => $srList,
            'customers' => $customers,
            'filters' => [
                'customer' => $request->customer,
                'month' => $request->month,
                'search' => $request->search,
            ]
        ]);
    }

    // DETAIL SUMMARY dengan data real
    public function show($id)
    {
        $sr = SR::findOrFail($id);
        $summaryData = $sr->getSummaryData();

        return Inertia::render('Summary/Show', [
            'sr' => [
                'id' => $sr->id,
                'sr_number' => $sr->sr_number,
                'customer' => $sr->customer,
                'month' => $sr->month,
                'upload_date' => $sr->created_at->format('Y-m-d H:i:s'),
            ],
            'data' => $summaryData
        ]);
    }
    
    // EXPORT TO EXCEL
    public function export($id)
    {
        $sr = SR::findOrFail($id);
        $summaryData = $sr->getSummaryData();

        return Excel::download(new SummaryExport($summaryData), "Summary_{$sr->sr_number}.xlsx");
    }
}