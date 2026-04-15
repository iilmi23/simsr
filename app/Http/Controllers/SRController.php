<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use App\Models\SR;
use App\Models\SPP;
use App\Models\Customer;
use App\Services\SR\TYCMapper;
use App\Services\SR\YNAMapper;
use App\Services\SR\SAIMapper;
use App\Services\SR\YCMapper;
use App\Services\SR\SRMapperInterface;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

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
            // 1. Simpan ke disk agar path stabil untuk IOFactory
            $tempPath = $this->storeTempFile($request->file('file'));

            // 2. Baca sheet array dengan PhpSpreadsheet Reader (memory-efficient)
            // Menggunakan Reader langsung untuk menghindari memory exhaustion
            $reader = $this->createReader($tempPath);
            $spreadsheet = $reader->load($tempPath);
            $worksheet = $spreadsheet->getSheet($sheetIndex);

            if ($worksheet === null) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Sheet tidak valid. Tersedia: ' . $spreadsheet->getSheetCount() . ' sheet.',
                ], 400);
            }

            // Convert to array dengan format yang konsisten (0-based index)
            $sheetData = [];
            $highestRow = $worksheet->getHighestRow();
            $highestCol = $worksheet->getHighestColumn();

            // Convert letter column to number
            $highestColIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestCol);

            for ($row = 1; $row <= $highestRow; $row++) {
                $rowData = [];
                for ($col = 1; $col <= $highestColIndex; $col++) {
                    $cellValue = $worksheet->getCellByColumnAndRow($col, $row)->getValue();
                    $rowData[] = $cellValue;
                }
                $sheetData[$row - 1] = $rowData;  // Convert to 0-based
            }

            $customer  = Customer::findOrFail($request->customer);
            $mapper    = $this->resolveMapper($customer->code);

            if ($mapper === null) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Customer ' . $customer->code . ' belum didukung.',
                ], 400);
            }

            // 3. Ekstrak hidden columns/rows via IOFactory (dipakai TYC & SAI)
            $options = $this->extractSheetOptions($tempPath, $sheetIndex, $customer->code);

            // 4. Map — semua mapper baru pakai signature seragam: map($sheet, $ref, $options)
            $mapped = $this->runMapper($mapper, $customer->code, $sheetData, $tempPath, $sheetIndex, $options);
            $mapped = array_values(array_filter($mapped));

            if (empty($mapped)) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Mapping gagal: tidak ada data valid. Total baris sheet: ' . count($sheetData),
                ], 400);
            }

            $firmCount        = count(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FIRM'));
            $forecastCount    = count(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FORECAST'));
            $uniqueParts      = count(array_unique(array_column($mapped, 'part_number')));
            $totalFirmQty     = array_sum(array_column(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FIRM'), 'qty'));
            $totalForecastQty = array_sum(array_column(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FORECAST'), 'qty'));
            $monthsCovered    = array_values(array_unique(array_column($mapped, 'month')));
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
                    'preview'            => array_slice($mapped, 0, 50),
                    'sample_mapping'     => $mapped[0] ?? null,
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
            'file'     => 'required|file|mimes:xlsx,xls,xlsm|max:51200',
            'sheet'    => 'required|integer|min:0',
            'customer' => 'required|exists:customers,id',
            'port'     => 'nullable|exists:ports,id',
        ]);

        $tempPath   = null;
        $sheetIndex = (int) $request->sheet;

        try {
            // 1. Simpan ke disk agar path stabil
            $tempPath     = $this->storeTempFile($request->file('file'));
            $originalName = $request->file('file')->getClientOriginalName();

            Log::info('SR Upload dimulai', [
                'file'      => $originalName,
                'customer'  => $request->customer,
                'sheet'     => $sheetIndex,
                'temp_path' => $tempPath,
            ]);

            // 2. Baca sheet array dengan PhpSpreadsheet Reader (memory-efficient)
            $reader = $this->createReader($tempPath);
            $spreadsheet = $reader->load($tempPath);
            $worksheet = $spreadsheet->getSheet($sheetIndex);

            if ($worksheet === null) {
                return redirect()->back()->with(
                    'error',
                    '❌ Sheet tidak valid. Tersedia: ' . $spreadsheet->getSheetCount() . ' sheet.'
                );
            }

            $sheetName = $worksheet->getTitle();

            // Convert to array dengan format yang konsisten (0-based index)
            $sheetData = [];
            $highestRow = $worksheet->getHighestRow();
            $highestCol = $worksheet->getHighestColumn();

            // Convert letter column to number
            $highestColIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestCol);

            for ($row = 1; $row <= $highestRow; $row++) {
                $rowData = [];
                for ($col = 1; $col <= $highestColIndex; $col++) {
                    $cellValue = $worksheet->getCellByColumnAndRow($col, $row)->getValue();
                    $rowData[] = $cellValue;
                }
                $sheetData[$row - 1] = $rowData;  // Convert to 0-based
            }

            if (empty($sheetData)) {
                return redirect()->back()->with('error', '❌ Sheet yang dipilih kosong.');
            }

            // 3. Validasi customer & port
            $customer = Customer::findOrFail($request->customer);
            $portName = null;

            if ($customer->ports()->exists()) {
                if (!$request->filled('port')) {
                    return redirect()->back()->with(
                        'error',
                        '❌ Port wajib diisi untuk customer ' . $customer->name . '.'
                    );
                }
                $port     = $customer->ports()->findOrFail($request->port);
                $portName = $port->name;
            }

            // 4. Resolve mapper
            $mapper = $this->resolveMapper($customer->code);

            if ($mapper === null) {
                return redirect()->back()->with(
                    'error',
                    '❌ Customer ' . $customer->code . ' belum didukung. Didukung: TYC, YNA, SAI, YC.'
                );
            }

            // 5. Ekstrak hidden columns/rows via IOFactory
            $options = $this->extractSheetOptions($tempPath, $sheetIndex, $customer->code);

            Log::info('Mapping dimulai', [
                'customer'       => $customer->code,
                'sheet_index'    => $sheetIndex,
                'rows'           => count($sheetData),
                'hidden_columns' => $options['hidden_columns'],
                'hidden_rows'    => $options['hidden_rows'],
            ]);

            // 6. Map
            $uploadBatches = [];
            if (strtoupper($customer->code) === 'YC') {
                $mapped = $this->runYCMapper($mapper, $tempPath, $options, true, $sheetIndex);
                $mapped = array_values(array_filter($mapped));

                if (empty($mapped)) {
                    return redirect()->back()->with(
                        'error',
                        '❌ Mapping gagal: tidak ada data valid untuk sheet YC. ' .
                            'Periksa format file untuk customer ' . $customer->name . '.'
                    );
                }

                $now         = now();
                $uploadBatch = Str::uuid()->toString();
                $uploadBatches[] = $uploadBatch;

                foreach ($mapped as &$item) {
                    $item['source_file']  = $originalName;
                    $item['upload_batch'] = $uploadBatch;
                    $item['sheet_index']  = $sheetIndex;
                    $item['sheet_name']   = $sheetName;
                    $item['port']         = $portName ?? ($item['port'] ?? null);
                    $item['customer']     = $customer->code;
                    $item['created_at']   = $now;
                    $item['updated_at']   = $now;
                }
                unset($item);
            } else {
                $mapped = $this->runMapper($mapper, $customer->code, $sheetData, $tempPath, $sheetIndex, $options);
                $mapped = array_values(array_filter($mapped));

                if (empty($mapped)) {
                    return redirect()->back()->with(
                        'error',
                        '❌ Mapping gagal: tidak ada data valid. ' .
                            'Periksa format file untuk customer ' . $customer->name . '.'
                    );
                }

                // 7. Tambah metadata
                $now         = now();
                $uploadBatch = Str::uuid()->toString();
                $uploadBatches[] = $uploadBatch;

                foreach ($mapped as &$item) {
                    $item['source_file']  = $originalName;
                    $item['upload_batch'] = $uploadBatch;
                    $item['sheet_index']  = $sheetIndex;
                    $item['sheet_name']   = $sheetName;
                    $item['port']         = $portName ?? ($item['port'] ?? null);
                    $item['customer']     = $customer->code;
                    $item['created_at']   = $now;
                    $item['updated_at']   = $now;
                }
                unset($item);
            }

            if (empty($mapped)) {
                return redirect()->back()->with(
                    'error',
                    '❌ Mapping gagal: tidak ada data valid. ' .
                        'Periksa format file untuk customer ' . $customer->name . '.'
                );
            }

            Log::info('Mapping selesai', ['records' => count($mapped)]);
            $sppRows = $this->buildSppRecords($mapped, $now);

            // 8. Insert ke DB
            DB::beginTransaction();
            try {
                $insertedCount = 0;
                foreach (array_chunk($mapped, 500) as $chunk) {
                    SR::insert($chunk);
                    $insertedCount += count($chunk);
                }

                if (!empty($sppRows)) {
                    foreach (array_chunk($sppRows, 500) as $chunk) {
                        SPP::insert($chunk);
                    }
                }

                DB::commit();
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('DB insert gagal: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
                return redirect()->back()->with(
                    'error',
                    '❌ Gagal menyimpan ke database: ' . $e->getMessage()
                );
            }

            $firmCount     = count(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FIRM'));
            $forecastCount = count(array_filter($mapped, fn($i) => ($i['order_type'] ?? '') === 'FORECAST'));
            $totalQty      = array_sum(array_column($mapped, 'qty'));

            $message = sprintf(
                '✅ Upload berhasil! Total records: %d (Firm: %d, Forecast: %d, Total Qty: %s)',
                $insertedCount,
                $firmCount,
                $forecastCount,
                number_format($totalQty)
            );

            Log::info($message, ['upload_batch' => $uploadBatches]);

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

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Resolve mapper berdasarkan customer code.
     *
     * Semua mapper mengimplementasikan SRMapperInterface dengan signature seragam:
     *   map(array $sheet, ?Carbon $referenceDate, array $options): array
     *
     * $options['hidden_columns'] = array of 0-based column indices yang hidden
     * $options['hidden_rows']    = array of 0-based row indices yang hidden
     */
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

    /**
     * Jalankan mapper dengan signature yang benar per customer.
     *
     * TYC & SAI : map($sheetData, null, $options)          ← SRMapperInterface standar
     * YNA       : map($sheetData, null, $tempPath, $sheetIndex) ← legacy signature berbeda
     * YC        : mapAllSheets($allSheets, $sheetNames, $hiddenSheets, null, $options) ← multi-sheet
     *
     * Ketika YNA & YC direfactor mengikuti interface standar, hapus branch di sini
     * dan cukup panggil $mapper->map($sheetData, null, $options) untuk semua.
     */
    private function runMapper(
        SRMapperInterface $mapper,
        string            $customerCode,
        array             $sheetData,
        string            $tempPath,
        int               $sheetIndex,
        array             $options
    ): array {
        try {
            if (strtoupper($customerCode) === 'YNA') {
                // YNAMapper: legacy signature — menerima filePath & sheetIndex
                return $mapper->map($sheetData, null, $tempPath, $sheetIndex);
            }

            if (strtoupper($customerCode) === 'YC') {
                // YCMapper: hanya proses sheet yang dipilih, baik untuk preview maupun upload
                $result = $this->runYCMapper($mapper, $tempPath, $options, true, $sheetIndex);

                // Validasi hasil YCMapper
                if (!is_array($result)) {
                    throw new \Exception('YCMapper result bukan array: ' . gettype($result));
                }

                return $result;
            }

            // TYCMapper, SAIMapper, dan semua mapper baru: signature standar
            return $mapper->map($sheetData, null, $options);
        } catch (\Exception $e) {
            Log::error("runMapper error for {$customerCode}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Jalankan YCMapper untuk multi-sheet processing.
     *
     * YCMapper berbeda karena:
     * - Satu file YC = multiple sheets (semua visible sheets)
     * - Setiap sheet = satu SR yang berbeda
     * - Hasil semua sheets di-merge menjadi satu array records
     *
     * @param bool $singleSheetMode Jika true, hanya proses sheet dengan index tertentu
     * @param int|null $sheetIndex Index sheet untuk single sheet mode
     */
    private function runYCMapper(YCMapper $mapper, string $tempPath, array $options, bool $singleSheetMode = false, ?int $sheetIndex = null, bool $groupBySheet = false): array
    {
        try {
            // Load spreadsheet untuk mendapatkan semua sheets
            $reader = $this->createReader($tempPath);
            $spreadsheet = $reader->load($tempPath);

            // Baca semua sheets menjadi array
            $allSheets    = [];
            $sheetNames   = [];
            $hiddenSheets = [];

            foreach ($spreadsheet->getWorksheetIterator() as $index => $worksheet) {
                $sheetName = $worksheet->getTitle();
                // PhpSpreadsheet tidak punya isHidden() method langsung
                // Hidden sheets biasanya tidak terlihat di iterator, tapi untuk aman
                // kita anggap semua sheets dari iterator adalah visible
                $isHidden = false; // Default: semua sheets dianggap visible

                $sheetNames[$index]   = $sheetName;
                $hiddenSheets[$index] = $isHidden;

                if ($isHidden) {
                    Log::info("YCMapper: skip hidden sheet {$index} '{$sheetName}'");
                    continue;
                }

                // Jika single sheet mode, skip sheets yang bukan yang diminta
                if ($singleSheetMode && $sheetIndex !== null && $index !== $sheetIndex) {
                    continue;
                }

                // Convert worksheet ke array format yang sama seperti single sheet
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
                    $sheetData[$row - 1] = $rowData; // Convert to 0-based
                }

                $allSheets[$index] = $sheetData;

                Log::info("YCMapper: loaded sheet {$index} '{$sheetName}' with " . count($sheetData) . " rows");
            }

            if (empty($allSheets)) {
                throw new \Exception('Tidak ada sheet visible yang bisa diproses');
            }

            // Jalankan YCMapper::mapAllSheets
            try {
                $sheetResults = $mapper->mapAllSheets($allSheets, $sheetNames, $hiddenSheets, null, $options);
            } catch (\Exception $e) {
                Log::error('YCMapper::mapAllSheets failed: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'sheets_count' => count($allSheets),
                ]);
                throw new \Exception('YCMapper error: ' . $e->getMessage());
            }

            // Validasi struktur hasil sebelum flatten
            if (!is_array($sheetResults)) {
                throw new \Exception('YCMapper::mapAllSheets harus return array, got ' . gettype($sheetResults));
            }

            if ($groupBySheet) {
                return $sheetResults;
            }

            // Flatten semua sheet results menjadi satu array flat untuk kompatibilitas
            $result = [];
            try {
                foreach ($sheetResults as $sheetIndex => $sheetRecords) {
                    if (!is_array($sheetRecords)) {
                        Log::warning("YCMapper: sheet $sheetIndex bukan array, skip", [
                            'type' => gettype($sheetRecords),
                        ]);
                        continue;
                    }
                    $result = array_merge($result, $sheetRecords);
                    unset($sheetRecords); // Bebaskan memory
                }
            } catch (\Exception $e) {
                Log::error('Flatten error: ' . $e->getMessage());
                throw new \Exception('Gagal memproses hasil sheets: ' . $e->getMessage());
            }

            unset($sheetResults); // Bebaskan memory sheet results
            return $result;

        } catch (\Exception $e) {
            Log::error('runYCMapper error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Jalankan YCMapper dan kembalikan hasil per sheet tanpa flatten.
     */
    private function runYCMapperGrouped(YCMapper $mapper, string $tempPath, array $options): array
    {
        return $this->runYCMapper($mapper, $tempPath, $options, false, null, true);
    }

    /**
     * Ekstrak hidden columns dan hidden rows dari file Excel menggunakan IOFactory.
     *
     * KENAPA IOFactory, bukan dari data Excel::toArray?
     * Excel::toArray (Maatwebsite) meratakan data ke array PHP — informasi
     * visual seperti hidden col/row tidak dipertahankan. IOFactory langsung
     * membaca metadata worksheet PhpSpreadsheet sehingga kita bisa mengambil
     * ColumnDimension::getVisible() dan RowDimension::getVisible().
     *
     * Hasil:
     *   hidden_columns → array of 0-based column indices  (mis. [4] untuk col E SAI)
     *   hidden_rows    → array of 0-based row indices
     *
     * Untuk SAI: col E (index 4) selalu hidden → SAIMapper sudah punya default
     * fallback [SAIMapper::COL_HIDDEN_E] di konstruktor, tapi tetap lebih baik
     * dibaca dari file agar akurat jika file berubah format di masa depan.
     */
    /**
     * Buat reader PhpSpreadsheet berdasarkan ekstensi file.
     * Mendukung xlsx, xlsm, dan xls.
     */
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
                throw new \Exception("Unsupported file type: {$extension}. Supported: xlsx, xlsm, xls");
        }

        $reader->setReadDataOnly(true); // Skip formula calculation
        return $reader;
    }

    private function extractSheetOptions(string $filePath, int $sheetIndex, string $customerCode): array
    {
        $options = [
            'hidden_columns' => [],
            'hidden_rows'    => [],
        ];

        // YNA tidak butuh hidden info (pakai IOFactory sendiri di dalam mapper)
        if (strtoupper($customerCode) === 'YNA') {
            return $options;
        }

        try {
            $reader = $this->createReader($filePath);
            $spreadsheet = $reader->load($filePath);
            $worksheet   = $spreadsheet->getSheet($sheetIndex);

            // ── Hidden columns ────────────────────────────────────────────────
            // getColumnDimensions() mengembalikan array ['A' => ColumnDimension, …]
            // hanya untuk kolom yang pernah diakses/diset → kolom yang benar-benar
            // diatur hidden di Excel.
            foreach ($worksheet->getColumnDimensions() as $colLetter => $colDim) {
                if (!$colDim->getVisible()) {
                    // Konversi letter ke 0-based index (A=0, B=1, …)
                    $oneBased = Coordinate::columnIndexFromString($colLetter);
                    $options['hidden_columns'][] = $oneBased - 1;
                }
            }

            // ── Hidden rows ───────────────────────────────────────────────────
            // getRowDimensions() mengembalikan array [rowNumber => RowDimension]
            // rowNumber adalah 1-based (Excel convention).
            foreach ($worksheet->getRowDimensions() as $rowNum => $rowDim) {
                if (!$rowDim->getVisible()) {
                    // Konversi ke 0-based index agar konsisten dengan $sheet array
                    $options['hidden_rows'][] = (int) $rowNum - 1;
                }
            }

            Log::info("extractSheetOptions [{$customerCode}]: hidden_cols=" .
                implode(',', $options['hidden_columns']) .
                ' hidden_rows=' . implode(',', $options['hidden_rows']));
        } catch (\Throwable $e) {
            // Jangan gagalkan upload hanya karena gagal baca hidden info.
            // Mapper masing-masing punya fallback default untuk hidden columns.
            Log::warning("extractSheetOptions gagal untuk {$customerCode}: " . $e->getMessage());
        }

        return $options;
    }

    /**
     * Simpan UploadedFile ke storage/app/temp/ dengan nama unik.
     * Mengembalikan absolute path yang stabil sepanjang request.
     *
     * KENAPA: getRealPath() pada UploadedFile menjadi tidak valid setelah
     * Excel::toArray() memproses file (Laravel memindahkan file temp PHP).
     * Dengan menyimpan dulu ke disk kita punya satu path yang aman
     * untuk dipakai berulang kali oleh Excel::toArray() maupun IOFactory::load().
     */
    private function storeTempFile(UploadedFile $file): string
    {
        $ext      = $file->getClientOriginalExtension() ?: 'xlsx';
        $filename = 'sr_temp_' . uniqid('', true) . '.' . $ext;
        $relPath  = 'temp/' . $filename;

        Storage::disk('local')->put($relPath, file_get_contents($file->getRealPath()));

        return Storage::disk('local')->path($relPath);
    }

    /**
     * Hapus temp file. Dipanggil di blok finally agar selalu bersih.
     */
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

    /**
     * Build SPP records dari mapped SR data.
     */
    private function buildSppRecords(array $mapped, $timestamp): array
    {
        return array_map(function ($item) use ($timestamp) {
            $extra = $item['extra'] ?? null;
            if (is_string($extra)) {
                $extra = json_decode($extra, true);
            }

            return [
                'customer'      => $item['customer']      ?? null,
                'part_number'   => $item['part_number']   ?? null,
                'model'         => $item['model']         ?? null,
                'family'        => $item['family']        ?? null,
                'month'         => $item['month']         ?? null,
                'week_label'    => $extra['week_label']   ?? null,
                'delivery_date' => $item['delivery_date'] ?? null,
                'eta'           => $item['eta']           ?? null,
                'etd'           => $item['etd']           ?? null,
                'qty'           => $item['qty']           ?? 0,
                'order_type'    => $item['order_type']    ?? null,
                'port'          => $item['port']          ?? null,
                'created_at'    => $timestamp,
                'updated_at'    => $timestamp,
            ];
        }, $mapped);
    }
}