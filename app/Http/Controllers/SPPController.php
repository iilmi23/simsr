<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\SR;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SPPController extends Controller
{
    public function index(Request $request)
    {
        $customers = Customer::orderBy('name')->get(['name', 'code']);

        $query = SR::query();
        if ($request->filled('customer')) {
            $query->where('customer', $request->customer);
        }

        $baseQuery = clone $query;

        $start = Carbon::now()->startOfMonth();
        $end = $start->copy()->addMonths(5)->endOfMonth();

        $rawItems = $query->whereNotNull('eta')
            ->whereBetween('eta', [$start->toDateString(), $end->toDateString()])
            ->get(['eta', 'qty', 'part_number']);

        $grouped = $rawItems->groupBy(function ($item) {
            return Carbon::parse($item->eta)->format('Y-m');
        });

        $sppData = collect(range(0, 5))->map(function ($offset) use ($start, $grouped) {
            $period = $start->copy()->addMonths($offset)->format('Y-m');
            $row = $grouped->get($period, collect());

            return [
                'period' => $period,
                'label' => $start->copy()->addMonths($offset)->format('F Y'),
                'total_qty' => $row->sum('qty'),
                'unique_parts' => $row->pluck('part_number')->unique()->count(),
                'total_lines' => $row->count(),
            ];
        });

        $summary = [
            'total_records' => $baseQuery->count(),
            'total_qty' => $baseQuery->sum('qty'),
            'unique_parts' => $baseQuery->distinct('part_number')->count('part_number'),
            'period_range' => sprintf('%s - %s', $start->format('F Y'), $end->format('F Y')),
        ];

        return Inertia::render('SPP/Index', [
            'customers' => $customers,
            'filters' => $request->only('customer'),
            'summary' => $summary,
            'sppData' => $sppData,
        ]);
    }

    public function show(Request $request, $period)
    {
        $customers = Customer::orderBy('name')->get(['name', 'code']);

        $query = SR::query();
        if ($request->filled('customer')) {
            $query->where('customer', $request->customer);
        }

        $date = Carbon::createFromFormat('Y-m', $period);
        $start = $date->copy()->startOfMonth();
        $end = $date->copy()->endOfMonth();

        $records = $query->whereBetween('eta', [$start->toDateString(), $end->toDateString()])->get();

        $summary = [
            'period' => $date->format('F Y'),
            'total_records' => $records->count(),
            'total_qty' => $records->sum('qty'),
            'unique_parts' => $records->pluck('part_number')->unique()->count(),
        ];

        return Inertia::render('SPP/Show', [
            'customers' => $customers,
            'filters' => $request->only('customer'),
            'period' => $period,
            'records' => $records,
            'summary' => $summary,
        ]);
    }
}