<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use App\Models\SR;
use App\Models\SPP;
use App\Models\Customer;
use App\Models\Assy;
use App\Services\SR\TYCMapper;
use App\Services\SR\YNAMapper;
use App\Services\SR\SAIMapper;
use App\Services\SR\YCMapper;
use App\Services\SR\SRMapperInterface;
use App\Services\WeekGenerator;
use App\Models\ProductionWeek;
use App\Models\EtdMapping;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class SRController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────
    // PAGES
    // ─────────────────────────────────────────────────────────────────────

    public function uploadPage()
    {
        return Inertia::render('UploadSR/Index', [
            'customers' => Customer::with(['ports' => function ($q) {
                $q->select('id', 'customer_id', 'name');
            }])->select('id', 'code', 'name')->get(),
            'carlines' => \App\Models\CarLine::select('id', 'code', 'description')->orderBy('code')->get(),
            'flash' => session('success') ? ['success' => session('success')] : null,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PREVIEW
    // ─────────────────────────────────────────────────────────────────────

    public function preview(Request $request)
    {
        $request->validate([
            'file'     => 'required|file|mimes:xlsx,xls,xlsm',
            'sheet'    => 'required|integer|min:0',
            'customer' => 'required|exists:customers,id',
            'port'     => 'nullable|exists:ports,id',
        ]);

        $tempPath   = null;
        $sheetIndex = (int) $request->sheet;

        try {
            $tempPath = $this->storeTempFile($request->file('file'));
            $reader = $this->createReader($tempPath);
            $spreadsheet = $reader->load($tempPath);
            $worksheet = $spreadsheet->getSheet($sheetIndex);

            if ($worksheet === null) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Sheet tidak valid. Tersedia: ' . $spreadsheet->getSheetCount() . ' sheet.',
                ], 400);
            }

            $sheetData = $this->worksheetToArray($worksheet);
            $customer = Customer::findOrFail($request->customer);
            $mapper = $this->resolveMapper($customer->code);

            if ($mapper === null) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Customer ' . $customer->code . ' belum didukung.',
                ], 400);
            }

            $options = $this->extractSheetOptions($tempPath, $sheetIndex, $customer->code);
            $mapped = $this->runMapper($mapper, $customer->code, $sheetData, $tempPath, $sheetIndex, $options);
            $mapped = array_values(array_filter($mapped));

            if (empty($mapped)) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Mapping gagal: tidak ada data valid.',
                ], 400);
            }

            // Cek part yang belum ada di master assy
            $unknownParts = [];
            foreach ($mapped as $item) {
                $assy = Assy::where('part_number', $item['part_number'])->first();
                if (!$assy && !in_array($item['part_number'], $unknownParts)) {
                    $unknownParts[] = $item['part_number'];
                }
            }

            $firmCount = count(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FIRM'));
            $forecastCount = count(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FORECAST'));
            $uniqueParts = count(array_unique(array_column($mapped, 'part_number')));
            $totalFirmQty = array_sum(array_column(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FIRM'), 'qty'));
            $totalForecastQty = array_sum(array_column(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FORECAST'), 'qty'));
            $monthsCovered = array_values(array_unique(array_column($mapped, 'month')));
            sort($monthsCovered);

            return response()->json([
                'success' => true,
                'data'    => [
                    'total_records'      => count($mapped),
                    'unique_parts'       => $uniqueParts,
                    'firm_count'         => $firmCount,
                    'forecast_count'     => $forecastCount,
                    'total_firm_qty'     => $totalFirmQty,
                    'total_forecast_qty' => $totalForecastQty,
                    'months_covered'     => $monthsCovered,
                    'unknown_parts'      => $unknownParts,
                    'has_unknown_parts'  => count($unknownParts) > 0,
                    'preview'            => array_slice($mapped, 0, 50),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Preview error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        } finally {
            $this->cleanupTempFile($tempPath);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // UPLOAD
    // ─────────────────────────────────────────────────────────────────────

    public function uploadTaiwan(Request $request)
    {
        $request->validate([
            'file'       => 'required|file|mimes:xlsx,xls,xlsm|max:51200',
            'sheet'      => 'required|integer|min:0',
            'customer'   => 'required|exists:customers,id',
            'port'       => 'nullable|exists:ports,id',
            'carline_id' => 'nullable|exists:carline,id',
        ]);

        $tempPath   = null;
        $sheetIndex = (int) $request->sheet;

        try {
            $tempPath = $this->storeTempFile($request->file('file'));
            $originalName = $request->file('file')->getClientOriginalName();
            $customerId = $request->customer;
            $customerCode = Customer::find($customerId)->code;

            Log::info('SR Upload dimulai', [
                'file'      => $originalName,
                'customer'  => $customerId,
                'sheet'     => $sheetIndex,
            ]);

            $reader = $this->createReader($tempPath);
            $spreadsheet = $reader->load($tempPath);
            $worksheet = $spreadsheet->getSheet($sheetIndex);

            if ($worksheet === null) {
                return redirect()->back()->with('error', '❌ Sheet tidak valid.');
            }

            $sheetName = $worksheet->getTitle();
            $sheetData = $this->worksheetToArray($worksheet);

            if (empty($sheetData)) {
                return redirect()->back()->with('error', '❌ Sheet yang dipilih kosong.');
            }

            // Validasi customer & port
            $customer = Customer::findOrFail($customerId);
            $portName = null;

            if ($customer->ports()->exists()) {
                if (!$request->filled('port')) {
                    return redirect()->back()->with('error', '❌ Port wajib diisi untuk customer ' . $customer->name . '.');
                }
                $port = $customer->ports()->findOrFail($request->port);
                $portName = $port->name;
            }

            // Resolve mapper
            $mapper = $this->resolveMapper($customer->code);
            if ($mapper === null) {
                return redirect()->back()->with('error', '❌ Customer ' . $customer->code . ' belum didukung.');
            }

            $options = $this->extractSheetOptions($tempPath, $sheetIndex, $customer->code);

            if (strtoupper($customer->code) === 'YNA' && method_exists($mapper, 'extractEtdRangeFromFile')) {
                try {
                    [$minEtd, $maxEtd] = $mapper->extractEtdRangeFromFile($tempPath);
                    if (!empty($minEtd) && !empty($maxEtd)) {
                        WeekGenerator::generateFromDateRange($customerId, $minEtd, $maxEtd);
                    }
                } catch (\Throwable $e) {
                    Log::warning('YNA week generation failed: ' . $e->getMessage());
                }
            }

            // Mapping data
            if (strtoupper($customer->code) === 'YC') {
                $mapped = $this->runYCMapper($mapper, $tempPath, $options, true, $sheetIndex);
                $mapped = array_values(array_filter($mapped));
            } else {
                $mapped = $this->runMapper($mapper, $customer->code, $sheetData, $tempPath, $sheetIndex, $options, $customerId);
                $mapped = array_values(array_filter($mapped));
            }

            if (empty($mapped)) {
                return redirect()->back()->with('error', '❌ Mapping gagal: tidak ada data valid.');
            }

            // ==================== AUTO-GENERATE WEEKS & ETD MAPPING ====================
            // 1. Extract semua ETD dari hasil mapping
            $etdDates = [];
            foreach ($mapped as $item) {
                if (!empty($item['etd'])) {
                    $etdDates[] = $item['etd'];
                }
            }

            // 2. Generate production weeks dari range ETD
            if (!empty($etdDates)) {
                $minEtd = min($etdDates);
                $maxEtd = max($etdDates);
                WeekGenerator::generateFromDateRange($customerId, $minEtd, $maxEtd);
                Log::info("Generated production weeks for range: {$minEtd} to {$maxEtd}");
            }

            // 3. Resolve mapping ETD ke week untuk setiap item
            // Gunakan week dari mapper jika sudah ada, fallback ke ProductionWeek resolve
            foreach ($mapped as &$item) {
                if (!empty($item['etd'])) {
                    // Jika mapper sudah provide week number, gunakan itu
                    if (!empty($item['week'])) {
                        // Week sudah dari mapper, tinggal resolve month/year jika perlu
                        $weekId = WeekGenerator::resolveEtdMapping($customerId, $item['etd']);
                        if ($weekId) {
                            $week = ProductionWeek::find($weekId);
                            if ($week && !$item['month']) {
                                $item['month'] = $week->month_name;
                                $item['year'] = $week->year;
                            }
                        }
                    } else {
                        // Resolve dari ProductionWeek berdasarkan ETD
                        $weekId = WeekGenerator::resolveEtdMapping($customerId, $item['etd']);
                        
                        if ($weekId) {
                            $week = ProductionWeek::find($weekId);
                            if ($week) {
                                $item['week'] = $week->week_no;
                                $item['month'] = $week->month_name;
                                $item['year'] = $week->year;
                            }
                        } else {
                            // Fallback: hitung manual dari tanggal (tidak ideal tapi aman)
                            $date = Carbon::parse($item['etd']);
                            $item['week'] = ceil($date->day / 7);
                            $item['month'] = strtoupper($date->shortMonthName);
                            $item['year'] = $date->year;
                            Log::warning("Week fallback untuk ETD {$item['etd']}: week={$item['week']}, month={$item['month']}");
                        }
                    }
                }
                
                // ==================== MAPPING KE MASTER ASSY ====================
                $assy = Assy::where('part_number', $item['part_number'])->first();
                if ($assy) {
                    $item['assy_id'] = $assy->id;
                    $item['is_mapped'] = true;
                    $item['mapping_error'] = null;
                } else {
                    // Auto-create missing part in master assy with safe defaults
                    try {
                        $newAssy = Assy::create([
                            'carline_id'  => $request->carline_id ?? null,
                            'part_number' => $item['part_number'],
                            'assy_code'   => null,
                            'level'       => null,
                            'type'        => null,
                            'umh'         => 0,
                            'std_pack'    => 0,
                            'is_active'   => true,
                        ]);

                        $item['assy_id'] = $newAssy->id;
                        $item['is_mapped'] = true;
                        $item['mapping_error'] = null;
                    } catch (\Exception $e) {
                        $item['assy_id'] = null;
                        $item['is_mapped'] = false;
                        $item['mapping_error'] = "Part number {$item['part_number']} tidak ditemukan dan gagal dibuat: " . $e->getMessage();
                    }
                }
            }
            unset($item);

            // Tambah metadata
            $now = now();
            $uploadBatch = Str::uuid()->toString();

            foreach ($mapped as &$item) {
                $item['source_file'] = $originalName;
                $item['upload_batch'] = $uploadBatch;
                $item['sheet_index'] = $sheetIndex;
                $item['sheet_name'] = $sheetName;
                $item['port'] = $portName ?? ($item['port'] ?? null);
                $item['carline_id'] = $request->carline_id ?? ($item['carline_id'] ?? null);
                $item['customer'] = $customer->code;
                $item['created_at'] = $now;
                $item['updated_at'] = $now;
            }
            unset($item);

            // Insert ke database
            DB::beginTransaction();
            try {
                $insertedCount = 0;
                foreach (array_chunk($mapped, 500) as $chunk) {
                    SR::insert($chunk);
                    $insertedCount += count($chunk);
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('DB insert gagal: ' . $e->getMessage());
                return redirect()->back()->with('error', '❌ Gagal menyimpan ke database: ' . $e->getMessage());
            }

            $mappedCount = count(array_filter($mapped, fn($i) => ($i['is_mapped'] ?? false) === true));
            $unmappedCount = count(array_filter($mapped, fn($i) => ($i['is_mapped'] ?? false) === false));
            $totalQty = array_sum(array_column($mapped, 'qty'));

            $message = sprintf(
                '✅ Upload berhasil! Total records: %d (Mapped: %d, Unmapped: %d, Total Qty: %s). Selanjutnya buka Summary untuk lihat batch terbaru.',
                $insertedCount,
                $mappedCount,
                $unmappedCount,
                number_format($totalQty)
            );

            if ($unmappedCount > 0) {
                $message .= ' ⚠️ Ada part yang tidak dikenal. Buka Summary dan tambahkan part tersebut ke master assy.';
                return redirect()->route('summary.index')->with('warning', $message);
            }

            return redirect()->route('summary.index')->with('success', $message);
        } catch (\Exception $e) {
            Log::error('Upload gagal: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return redirect()->back()->with('error', '❌ Upload gagal: ' . $e->getMessage());
        } finally {
            $this->cleanupTempFile($tempPath);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // OTHER ACTIONS
    // ─────────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = SR::query();

        if ($request->filled('part_number')) {
            $query->where('part_number', 'like', '%' . $request->part_number . '%');
        }
        if ($request->filled('order_type')) {
            $query->where('order_type', $request->order_type);
        }
        if ($request->filled('start_date')) {
            $query->where('delivery_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('delivery_date', '<=', $request->end_date);
        }

        $srs = $query->orderBy('delivery_date')->paginate(50)->withQueryString();

        $summary = [
            'total_records'  => SR::count(),
            'total_firm'     => SR::where('order_type', 'FIRM')->count(),
            'total_forecast' => SR::where('order_type', 'FORECAST')->count(),
            'total_qty'      => SR::sum('qty'),
            'unique_parts'   => SR::distinct('part_number')->count('part_number'),
            'mapped_count'   => SR::where('is_mapped', true)->count(),
            'unmapped_count' => SR::where('is_mapped', false)->count(),
        ];

        return Inertia::render('SR/Index', [
            'srs'     => $srs,
            'summary' => $summary,
            'filters' => $request->all(),
            'flash'   => session('success') ? ['success' => session('success')] : null,
        ]);
    }

    public function destroy($id)
    {
        try {
            DB::beginTransaction();
            SR::findOrFail($id)->delete();
            DB::commit();
            return redirect()->route('summary.index')->with('success', '✓ Record dihapus.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Delete SR error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal hapus: ' . $e->getMessage());
        }
    }

    public function getSummaryData($id)
    {
        try {
            $sr = SR::findOrFail($id);
            return response()->json(['success' => true, 'sr' => $sr, 'data' => [$sr]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Data tidak ditemukan'], 400);
        }
    }

    /**
     * Remap part yang tidak dikenal
     */
    public function remap($id)
    {
        try {
            $sr = SR::findOrFail($id);
            $assy = assy::where('part_number', $sr->part_number)->first();
            
            if ($assy) {
                $sr->update([
                    'assy_id' => $assy->id,
                    'is_mapped' => true,
                    'mapping_error' => null,
                ]);
                return response()->json(['success' => true, 'message' => 'Part berhasil di-remap']);
            }
            
            return response()->json(['success' => false, 'message' => 'Part tidak ditemukan di master assy'], 404);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────

    private function worksheetToArray($worksheet): array
    {
        $sheetData = [];
        $highestRow = $worksheet->getHighestRow();
        $highestCol = $worksheet->getHighestColumn();
        $highestColIndex = Coordinate::columnIndexFromString($highestCol);

        for ($row = 1; $row <= $highestRow; $row++) {
            $rowData = [];
            for ($col = 1; $col <= $highestColIndex; $col++) {
                $cellValue = $worksheet->getCellByColumnAndRow($col, $row)->getValue();
                $rowData[] = $cellValue;
            }
            $sheetData[$row - 1] = $rowData;
        }

        return $sheetData;
    }

    private function resolveMapper(string $code): ?SRMapperInterface
    {
        return match (strtoupper($code)) {
            'TYC'   => new TYCMapper(),
            'YNA'   => new YNAMapper(),
            'SAI'   => new SAIMapper(),
            'YC'    => new YCMapper(),
            default => null,
        };
    }

    private function runMapper(
        SRMapperInterface $mapper,
        string $customerCode,
        array $sheetData,
        string $tempPath,
        int $sheetIndex,
        array $options,
        ?int $customerId = null
    ): array {
        try {
            if (strtoupper($customerCode) === 'YNA') {
                return $mapper->map($sheetData, null, $tempPath, $sheetIndex, $customerId);
            }

            if (strtoupper($customerCode) === 'YC') {
                return $this->runYCMapper($mapper, $tempPath, $options, true, $sheetIndex);
            }

            return $mapper->map($sheetData, null, $options);
        } catch (\Exception $e) {
            Log::error("runMapper error for {$customerCode}: " . $e->getMessage());
            throw $e;
        }
    }

    private function runYCMapper(YCMapper $mapper, string $tempPath, array $options, bool $singleSheetMode = false, ?int $sheetIndex = null): array
    {
        try {
            $reader = $this->createReader($tempPath);
            $spreadsheet = $reader->load($tempPath);

            $allSheets = [];
            $sheetNames = [];

            foreach ($spreadsheet->getWorksheetIterator() as $index => $worksheet) {
                $sheetName = $worksheet->getTitle();
                $sheetNames[$index] = $sheetName;

                if ($singleSheetMode && $sheetIndex !== null && $index !== $sheetIndex) {
                    continue;
                }

                $allSheets[$index] = $this->worksheetToArray($worksheet);
            }

            if (empty($allSheets)) {
                throw new \Exception('Tidak ada sheet yang bisa diproses');
            }

            $sheetResults = $mapper->mapAllSheets($allSheets, $sheetNames, [], null, $options);

            if (!is_array($sheetResults)) {
                throw new \Exception('YCMapper harus return array');
            }

            $result = [];
            foreach ($sheetResults as $sheetRecords) {
                if (is_array($sheetRecords)) {
                    $result = array_merge($result, $sheetRecords);
                }
            }

            return $result;
        } catch (\Exception $e) {
            Log::error('runYCMapper error: ' . $e->getMessage());
            throw $e;
        }
    }

    private function createReader(string $filePath): \PhpOffice\PhpSpreadsheet\Reader\IReader
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        switch ($extension) {
            case 'xlsx':
            case 'xlsm':
                $reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
                break;
            case 'xls':
                $reader = new \PhpOffice\PhpSpreadsheet\Reader\Xls();
                break;
            default:
                throw new \Exception("Unsupported file type: {$extension}");
        }

        $reader->setReadDataOnly(true);
        return $reader;
    }

    private function extractSheetOptions(string $filePath, int $sheetIndex, string $customerCode): array
    {
        $options = [
            'hidden_columns' => [],
            'hidden_rows'    => [],
        ];

        if (strtoupper($customerCode) === 'YNA') {
            return $options;
        }

        try {
            $reader = $this->createReader($filePath);
            $spreadsheet = $reader->load($filePath);
            $worksheet = $spreadsheet->getSheet($sheetIndex);

            foreach ($worksheet->getColumnDimensions() as $colLetter => $colDim) {
                if (!$colDim->getVisible()) {
                    $oneBased = Coordinate::columnIndexFromString($colLetter);
                    $options['hidden_columns'][] = $oneBased - 1;
                }
            }

            foreach ($worksheet->getRowDimensions() as $rowNum => $rowDim) {
                if (!$rowDim->getVisible()) {
                    $options['hidden_rows'][] = (int) $rowNum - 1;
                }
            }
        } catch (\Throwable $e) {
            Log::warning("extractSheetOptions gagal: " . $e->getMessage());
        }

        return $options;
    }

    private function storeTempFile(UploadedFile $file): string
    {
        $ext = $file->getClientOriginalExtension() ?: 'xlsx';
        $filename = 'sr_temp_' . uniqid('', true) . '.' . $ext;
        $relPath = 'temp/' . $filename;

        Storage::disk('local')->put($relPath, file_get_contents($file->getRealPath()));

        return Storage::disk('local')->path($relPath);
    }

    private function cleanupTempFile(?string $absolutePath): void
    {
        if ($absolutePath === null || !file_exists($absolutePath)) {
            return;
        }

        try {
            $storagePath = storage_path('app');
            if (str_starts_with($absolutePath, $storagePath)) {
                $rel = ltrim(substr($absolutePath, strlen($storagePath)), DIRECTORY_SEPARATOR);
                Storage::disk('local')->delete($rel);
            } else {
                @unlink($absolutePath);
            }
        } catch (\Throwable $e) {
            Log::warning('Gagal hapus temp file: ' . $e->getMessage());
        }
    }
}