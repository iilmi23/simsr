<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SR;
use App\Models\SPP;
use App\Models\Customer;
use App\Models\Port;
use App\Services\SR\TYCMapper;
use Maatwebsite\Excel\Facades\Excel;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SRController extends Controller
{
    public function uploadPage()
    {
        return Inertia::render('UploadSR/Index', [
            'customers' => Customer::with(['ports' => function ($query) {
                $query->select('id', 'customer_id', 'name');
            }])->select('id', 'code', 'name')->get()
        ]);
    }

    /**
     * Preview data sebelum upload
     */
    public function preview(Request $request)
    {
        // VALIDASI
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls',
            'sheet' => 'required|integer|min:0',
            'customer' => 'required|exists:customers,id',
            'port' => 'nullable|exists:ports,id',
        ]);

        try {
            $excel = Excel::toArray(null, $request->file('file'));
        } catch (\Exception $e) {
            Log::error('Error reading Excel file: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Gagal membaca file Excel: ' . $e->getMessage()
            ], 400);
        }

        // AMBIL SHEET
        $sheetIndex = (int) $request->sheet;

        if (!isset($excel[$sheetIndex])) {
            return response()->json([
                'success' => false,
                'error' => 'Sheet tidak valid. Tersedia ' . count($excel) . ' sheet'
            ], 400);
        }

        $data = $excel[$sheetIndex];
        
        // CUSTOMER
        $customer = Customer::find($request->customer);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'error' => 'Customer tidak ditemukan'
            ], 400);
        }

        // MAPPER
        try {
            switch ($customer->code) {
                case 'TYC':
                    $mapper = new TYCMapper();
                    break;
                default:
                    return response()->json([
                        'success' => false,
                        'error' => 'Customer ' . $customer->code . ' belum didukung'
                    ], 400);
            }

            // MAPPING
            $mapped = $mapper->map($data);

            // BUANG ROW KOSONG
            $mapped = array_filter($mapped, fn($item) => !empty($item));
            $mapped = array_values($mapped); // reindex array

            if (empty($mapped)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Mapping gagal! Tidak ada data valid. Total row: ' . count($data)
                ], 400);
            }

            // Hitung summary
            $firmCount = count(array_filter($mapped, fn($item) => ($item['order_type'] ?? '') === 'FIRM'));
            $forecastCount = count(array_filter($mapped, fn($item) => ($item['order_type'] ?? '') === 'FORECAST'));
            $uniqueParts = count(array_unique(array_column($mapped, 'part_number')));
            
            // Hitung total qty per order type
            $totalFirmQty = array_sum(array_column(array_filter($mapped, fn($item) => ($item['order_type'] ?? '') === 'FIRM'), 'qty'));
            $totalForecastQty = array_sum(array_column(array_filter($mapped, fn($item) => ($item['order_type'] ?? '') === 'FORECAST'), 'qty'));
            
            // Ambil sample data untuk preview (max 50)
            $preview = array_slice($mapped, 0, 50);
            
            $monthsCovered = array_values(array_unique(array_map(function ($item) {
                return $item['month'] ?? null;
            }, $mapped)));
            sort($monthsCovered);

            return response()->json([
                'success' => true,
                'data' => [
                    'total_records' => count($mapped),
                    'unique_parts' => $uniqueParts,
                    'firm_count' => $firmCount,
                    'forecast_count' => $forecastCount,
                    'total_firm_qty' => $totalFirmQty,
                    'total_forecast_qty' => $totalForecastQty,
                    'months_covered' => $monthsCovered,
                    'preview' => $preview,
                    'sample_mapping' => $preview[0] ?? null,
                ]
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error in preview: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload data ke database
     */
    public function uploadTaiwan(Request $request)
    {
        // VALIDASI
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls',
            'sr_number' => 'nullable|string',
            'sheet' => 'required|integer|min:0',
            'customer' => 'required|exists:customers,id',
            'port' => 'nullable|exists:ports,id',
        ]);

        // BACA FILE
        try {
            $excel = Excel::toArray(null, $request->file('file'));
        } catch (\Exception $e) {
            Log::error('Error reading Excel file: ' . $e->getMessage());
            return back()->withErrors([
                'file' => 'Gagal membaca file Excel: ' . $e->getMessage()
            ]);
        }

        // AMBIL SHEET
        $sheetIndex = (int) $request->sheet;

        if (!isset($excel[$sheetIndex])) {
            return back()->withErrors([
                'sheet' => 'Sheet tidak valid. Tersedia ' . count($excel) . ' sheet'
            ]);
        }

        $data = $excel[$sheetIndex];
        
        // CUSTOMER
        $customer = Customer::find($request->customer);

        if (!$customer) {
            return back()->withErrors([
                'customer' => 'Customer tidak ditemukan'
            ]);
        }

        $portName = null;
        if ($customer->ports()->exists() && !$request->filled('port')) {
            return back()->withErrors([
                'port' => 'Port harus dipilih untuk customer ini.'
            ])->withInput();
        }

        if ($request->filled('port')) {
            $port = $customer->ports()->find($request->port);
            if ($port) {
                $portName = $port->name;
            } else {
                return back()->withErrors([
                    'port' => 'Port tidak valid untuk customer ini.'
                ])->withInput();
            }
        }

        try {
            switch ($customer->code) {
                case 'TYC':
                    $mapper = new TYCMapper();
                    break;
                default:
                    return back()->withErrors([
                        'customer' => 'Customer ' . $customer->code . ' belum didukung'
                    ]);
            }

            // MAPPING
            $mapped = $mapper->map($data);

            // BUANG ROW KOSONG
            $mapped = array_filter($mapped, fn($item) => !empty($item));
            $mapped = array_values($mapped); // reindex array

            if (empty($mapped)) {
                return back()->withErrors([
                    'file' => 'Mapping gagal! Total row: ' . count($data)
                ]);
            }

            // TAMBAH INFO DAN timestamp
            $now = now();
            foreach ($mapped as &$item) {
                $item['sr_number'] = $request->sr_number;
                $item['source_file'] = $request->file('file')->getClientOriginalName();
                $item['port'] = $portName;
                $item['created_at'] = $now;
                $item['updated_at'] = $now;
            }
            unset($item);

            $sppRows = $this->buildSppRecords($mapped, $now);

            // INSERT (SAFE)
            DB::beginTransaction();

            try {
                // Insert chunk untuk menghindari memory overload
                $chunks = array_chunk($mapped, 500);
                $insertedCount = 0;
                foreach ($chunks as $chunk) {
                    SR::insert($chunk);
                    $insertedCount += count($chunk);
                }

                if (!empty($sppRows)) {
                    foreach (array_chunk($sppRows, 500) as $chunk) {
                        SPP::insert($chunk);
                    }
                }
                DB::commit();
                
                // Hitung summary untuk response
                $firmCount = count(array_filter($mapped, fn($item) => ($item['order_type'] ?? '') === 'FIRM'));
                $forecastCount = count(array_filter($mapped, fn($item) => ($item['order_type'] ?? '') === 'FORECAST'));
                
                $message = sprintf(
                    'Upload berhasil! %d data tersimpan. (FIRM: %d, FORECAST: %d)',
                    $insertedCount,
                    $firmCount,
                    $forecastCount
                );
                
                return back()->with('success', $message);
                
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error saving to database: ' . $e->getMessage());
                
                return back()->withErrors([
                    'file' => 'Gagal simpan ke database: ' . $e->getMessage()
                ]);
            }
            
        } catch (\Exception $e) {
            Log::error('Error in mapping: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return back()->withErrors([
                'file' => 'Error: ' . $e->getMessage()
            ]);
        }
    }

    private function buildSppRecords(array $mapped, $timestamp): array
    {
        return array_map(function ($item) use ($timestamp) {
            $extra = $item['extra'] ?? null;
            if (is_string($extra)) {
                $extra = json_decode($extra, true);
            }

            return [
                'customer' => $item['customer'] ?? null,
                'sr_number' => $item['sr_number'] ?? null,
                'part_number' => $item['part_number'] ?? null,
                'model' => $item['model'] ?? null,
                'family' => $item['family'] ?? null,
                'month' => $item['month'] ?? null,
                'week_label' => $extra['week_label'] ?? null,
                'delivery_date' => $item['delivery_date'] ?? null,
                'eta' => $item['eta'] ?? null,
                'etd' => $item['etd'] ?? null,
                'qty' => $item['qty'] ?? 0,
                'order_type' => $item['order_type'] ?? null,
                'port' => $item['port'] ?? null,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];
        }, $mapped);
    }

    /**
     * Get all uploaded SR data (untuk ditampilkan di halaman lain)
     */
    public function index(Request $request)
    {
        $query = SR::query();
        
        // Filter berdasarkan sr_number
        if ($request->filled('sr_number')) {
            $query->where('sr_number', 'like', '%' . $request->sr_number . '%');
        }
        
        // Filter berdasarkan part_number
        if ($request->filled('part_number')) {
            $query->where('part_number', 'like', '%' . $request->part_number . '%');
        }
        
        // Filter berdasarkan order_type
        if ($request->filled('order_type')) {
            $query->where('order_type', $request->order_type);
        }
        
        // Filter berdasarkan tanggal
        if ($request->filled('start_date')) {
            $query->where('delivery_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('delivery_date', '<=', $request->end_date);
        }
        
        $srs = $query->orderBy('delivery_date', 'asc')
                    ->paginate(50)
                    ->withQueryString();
        
        // Summary data
        $summary = [
            'total_records' => SR::count(),
            'total_firm' => SR::where('order_type', 'FIRM')->count(),
            'total_forecast' => SR::where('order_type', 'FORECAST')->count(),
            'total_qty' => SR::sum('qty'),
            'unique_parts' => SR::distinct('part_number')->count('part_number'),
        ];
        
        return Inertia::render('SR/Index', [
            'srs' => $srs,
            'summary' => $summary,
            'filters' => $request->all()
        ]);
    }
}