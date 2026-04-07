<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\SR;
use App\Models\Customer;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\SummaryExport;
use App\Exports\SummaryListExport;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SummaryController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────
    // LIST
    // ─────────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = SR::query();

        if ($request->filled('customer')) {
            $query->where('customer', $request->customer);
        }
        if ($request->filled('search')) {
            $query->where('source_file', 'like', '%' . $request->search . '%');
        }
        if ($request->filled('part_number')) {
            $query->where('part_number', 'like', '%' . $request->part_number . '%');
        }
        if ($request->filled('order_type')) {
            $query->where('order_type', $request->order_type);
        }
        if ($request->filled('etd_start')) {
            $query->where('etd', '>=', $request->etd_start);
        }
        if ($request->filled('etd_end')) {
            $query->where('etd', '<=', $request->etd_end);
        }
        if ($request->filled('eta_start')) {
            $query->where('eta', '>=', $request->eta_start);
        }
        if ($request->filled('eta_end')) {
            $query->where('eta', '<=', $request->eta_end);
        }
        if ($request->filled('month')) {
            $query->where('month', $request->month);
        }

        $srList = $query
            ->selectRaw('
                MIN(id)           as id,
                customer,
                port,
                source_file,
                upload_batch,
                MIN(created_at)   as upload_date,
                COUNT(*)          as total_items,
                SUM(qty)          as total_qty,
                SUM(CASE WHEN order_type = \'FIRM\'     THEN qty ELSE 0 END) as firm_qty,
                SUM(CASE WHEN order_type = \'FORECAST\' THEN qty ELSE 0 END) as forecast_qty,
                COUNT(CASE WHEN order_type = \'FIRM\'     THEN 1 END)        as firm_count,
                COUNT(CASE WHEN order_type = \'FORECAST\' THEN 1 END)        as forecast_count,
                COUNT(DISTINCT part_number)                                   as unique_parts,
                MIN(etd)          as earliest_etd,
                MAX(etd)          as latest_etd
            ')
            ->groupBy('customer', 'port', 'source_file', 'upload_batch')
            ->orderByRaw('MIN(created_at) desc')
            ->get();

        Log::info('Summary index', [
            'total_results' => $srList->count(),
            'filters'       => $request->only([
                'customer', 'search', 'part_number', 'order_type',
                'etd_start', 'etd_end', 'eta_start', 'eta_end', 'month',
            ]),
        ]);

        $customers = Customer::orderBy('name')->get(['name', 'code']);

        return Inertia::render('Summary/Index', [
            'srList'    => $srList,
            'customers' => $customers,
            'filters'   => $request->only([
                'customer', 'month', 'search', 'part_number', 'order_type',
                'etd_start', 'etd_end', 'eta_start', 'eta_end',
            ]),
            'flash'     => session('success') ? ['success' => session('success')] : null,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DETAIL PAGE
    // ─────────────────────────────────────────────────────────────────────

    public function show($id)
    {
        $sr          = SR::findOrFail($id);
        $summaryData = SR::where('upload_batch', $sr->upload_batch)
            ->orderBy('etd')
            ->orderBy('part_number')
            ->get();

        return Inertia::render('Summary/Show', [
            'sr'   => [
                'id'          => $sr->id,
                'source_file' => $sr->source_file,
                'customer'    => $sr->customer,
                'port'        => $sr->port,
                'month'       => $sr->month,
                'upload_date' => $sr->created_at->format('Y-m-d H:i:s'),
            ],
            'data' => $summaryData,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // DETAIL DATA (JSON — untuk modal)
    // ─────────────────────────────────────────────────────────────────────

    public function data($id)
    {
        try {
            $sr          = SR::findOrFail($id);
            $summaryData = SR::where('upload_batch', $sr->upload_batch)
                ->orderBy('etd')
                ->orderBy('part_number')
                ->get();

            // ── Agregat ringkasan per batch ───────────────────────────────
            $firmQty     = $summaryData->where('order_type', 'FIRM')->sum('qty');
            $forecastQty = $summaryData->where('order_type', 'FORECAST')->sum('qty');
            $months      = $summaryData->pluck('month')->unique()->sort()->values();

            return response()->json([
                'success' => true,
                'sr'      => [
                    'id'           => $sr->id,
                    'source_file'  => $sr->source_file,
                    'customer'     => $sr->customer,
                    'port'         => $sr->port,
                    'upload_date'  => $sr->created_at->format('Y-m-d H:i:s'),
                ],
                'summary' => [
                    'total_records'  => $summaryData->count(),
                    'unique_parts'   => $summaryData->pluck('part_number')->unique()->count(),
                    'firm_qty'       => $firmQty,
                    'forecast_qty'   => $forecastQty,
                    'total_qty'      => $firmQty + $forecastQty,
                    'months_covered' => $months,
                ],
                'data'    => $summaryData,
            ]);
        } catch (\Exception $e) {
            Log::error('SummaryController::data error: ' . $e->getMessage());
            return response()->json(['success' => false, 'error' => 'Data tidak ditemukan'], 404);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // DELETE BATCH
    // ─────────────────────────────────────────────────────────────────────

    public function destroy($id)
    {
        try {
            DB::beginTransaction();

            $sr          = SR::findOrFail($id);
            $uploadBatch = $sr->upload_batch;
            $sourceFile  = $sr->source_file;

            $deletedCount = SR::where('upload_batch', $uploadBatch)->delete();

            DB::commit();

            return redirect()->route('summary.index')
                ->with('success', "✓ Upload \"{$sourceFile}\" dihapus! ({$deletedCount} records)");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('SummaryController::destroy error: ' . $e->getMessage());
            return redirect()->route('summary.index')
                ->with('error', 'Gagal hapus: ' . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // EXPORT
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Export detail satu upload batch ke Excel.
     */
    public function export($id)
    {
        try {
            $sr          = SR::findOrFail($id);
            $summaryData = SR::where('upload_batch', $sr->upload_batch)
                ->orderBy('etd')
                ->orderBy('part_number')
                ->get();

            $filename = Str::slug(pathinfo($sr->source_file, PATHINFO_FILENAME)) ?: $sr->id;
            return Excel::download(
                new SummaryExport($summaryData, $sr),
                "Summary_{$filename}_Detail.xlsx"
            );
        } catch (\Exception $e) {
            Log::error('Export error: ' . $e->getMessage());
            return redirect()->route('summary.index')
                ->with('error', 'Gagal export: ' . $e->getMessage());
        }
    }

    /**
     * Export semua upload yang cocok dengan filter ke Excel.
     */
    public function exportAll(Request $request)
    {
        $query = SR::query();

        if ($request->filled('customer')) {
            $query->where('customer', $request->customer);
        }
        if ($request->filled('month')) {
            $query->where('month', $request->month);
        }
        if ($request->filled('search')) {
            $query->where('source_file', 'like', '%' . $request->search . '%');
        }
        if ($request->filled('part_number')) {
            $query->where('part_number', 'like', '%' . $request->part_number . '%');
        }
        if ($request->filled('order_type')) {
            $query->where('order_type', $request->order_type);
        }
        if ($request->filled('etd_start')) {
            $query->where('etd', '>=', $request->etd_start);
        }
        if ($request->filled('etd_end')) {
            $query->where('etd', '<=', $request->etd_end);
        }
        if ($request->filled('eta_start')) {
            $query->where('eta', '>=', $request->eta_start);
        }
        if ($request->filled('eta_end')) {
            $query->where('eta', '<=', $request->eta_end);
        }

        $srList = $query
            ->selectRaw('
                MIN(id)           as id,
                customer,
                port,
                source_file,
                upload_batch,
                MIN(created_at)   as upload_date,
                COUNT(*)          as total_items,
                SUM(qty)          as total_qty,
                SUM(CASE WHEN order_type = \'FIRM\'     THEN qty ELSE 0 END) as firm_qty,
                SUM(CASE WHEN order_type = \'FORECAST\' THEN qty ELSE 0 END) as forecast_qty,
                COUNT(DISTINCT part_number)                                   as unique_parts
            ')
            ->groupBy('customer', 'port', 'source_file', 'upload_batch')
            ->orderByRaw('MIN(created_at) desc')
            ->get();

        return Excel::download(new SummaryListExport($srList), 'Summary_List.xlsx');
    }
}