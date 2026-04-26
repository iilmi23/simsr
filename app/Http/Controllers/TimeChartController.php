<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use App\Models\TimeChart;
use App\Models\Customer;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class TimeChartController extends Controller
{
    /**
     * Halaman index time chart
     */
    public function index(Request $request)
    {
        $year  = (int) $request->get('year', now()->year);
        $month = (int) $request->get('month', now()->month);

        $customers   = Customer::select('id', 'code', 'name')->orderBy('code')->get();
        $timeCharts  = TimeChart::getForMonth($year, $month);
        $needsUpload = $timeCharts->isEmpty();

        $formattedCharts = $needsUpload ? [] : $timeCharts->map(fn($chart) => [
            'id'                 => $chart->id,
            'week_number'        => $chart->week_number,
            'start_date'         => $chart->start_date?->format('Y-m-d'),
            'end_date'           => $chart->end_date?->format('Y-m-d'),
            'working_days'       => $chart->working_days,
            'total_working_days' => $chart->total_working_days,
            'source_file'        => $chart->source_file,
            'upload_batch'       => $chart->upload_batch,
        ]);

        return Inertia::render('Master/TimeChart/Index', [
            'customers'   => $customers,
            'timeCharts'  => $formattedCharts,
            'year'        => $year,
            'month'       => $month,
            'monthName'   => Carbon::create($year, $month, 1)->format('F Y'),
            'needsUpload' => $needsUpload,
            'latestBatch' => TimeChart::getLatestBatch(),
        ]);
    }

    /**     * Preview data dari Excel sebelum upload
     * 
     * Endpoint ini:
     * - Baca file Excel tanpa perlu full parsing
     * - Return sheets available + sample data dari sheet yang dipilih
     * - Gunakan untuk preview sebelum confirm upload
     */
    public function preview(Request $request)
    {
        $request->validate([
            'file'        => 'required|file|mimes:xlsx,xls,xlsm',
            'sheet'       => 'required|integer|min:0',
            'year'        => 'required|integer|min:2020|max:2030',
            'month'       => 'required|integer|min:1|max:12',
            'customer_id' => 'required|exists:customers,id',
        ]);

        $tempPath = null;

        try {
            $tempPath    = $this->storeTempFile($request->file('file'));
            $reader      = $this->createReader($tempPath);
            $spreadsheet = $reader->load($tempPath);
            $sheetIndex  = (int) $request->sheet;
            $year        = (int) $request->year;
            $month       = (int) $request->month;
            $customer    = Customer::findOrFail($request->customer_id);

            // Validate sheet exists
            if ($sheetIndex >= $spreadsheet->getSheetCount()) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Sheet index ' . $sheetIndex . ' tidak valid. Total sheet: ' . $spreadsheet->getSheetCount(),
                ], 400);
            }

            $worksheet = $spreadsheet->getSheet($sheetIndex);

            // Get available sheets
            $sheets = [];
            for ($i = 0; $i < $spreadsheet->getSheetCount(); $i++) {
                $sheets[] = [
                    'index' => $i,
                    'name'  => $spreadsheet->getSheet($i)->getTitle(),
                ];
            }

            // Parse data
            $timeChartData = $this->parseByCustomer(
                $worksheet, $year, $month, strtoupper($customer->code)
            );

            if (empty($timeChartData)) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Tidak ada data time chart yang valid untuk bulan ' . $month . '/' . $year . '.',
                    'sheets'  => $sheets,
                ], 400);
            }

            // Format preview data
            $preview = array_map(function ($chart) {
                return [
                    'week_number'        => $chart['week_number'],
                    'start_date'         => is_string($chart['start_date']) 
                        ? $chart['start_date'] 
                        : $chart['start_date']->format('Y-m-d'),
                    'end_date'           => is_string($chart['end_date']) 
                        ? $chart['end_date'] 
                        : $chart['end_date']->format('Y-m-d'),
                    'total_working_days' => count($chart['working_days']),
                    'working_days'       => $chart['working_days'],
                ];
            }, $timeChartData);

            return response()->json([
                'success'     => true,
                'sheets'      => $sheets,
                'current_sheet' => [
                    'index' => $sheetIndex,
                    'name'  => $worksheet->getTitle(),
                ],
                'preview'     => $preview,
                'total_weeks' => count($preview),
                'message'     => 'Data siap di-upload',
            ]);

        } catch (\Exception $e) {
            Log::error('TimeChart preview error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], 400);
        } finally {
            if ($tempPath && file_exists($tempPath)) @unlink($tempPath);
        }
    }

    /**     * Upload time chart dengan deduplication logic.
     * 
     * Fitur:
     * - Detect re-upload dengan file_hash
     * - UPSERT logic, bukan DELETE+INSERT
     * - Prevent duplikasi dengan unique constraint (year, month, week_number)
     * - Support template multi-bulan (tahunan, 6-bulan, bulanan)
     * 
     * customer_id HANYA untuk memilih parser — tidak disimpan ke database.
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file'        => 'required|file|mimes:xlsx,xls,xlsm',
            'sheet'       => 'required|integer|min:0',
            'year'        => 'required|integer|min:2020|max:2030',
            'month'       => 'required|integer|min:1|max:12',
            'customer_id' => 'required|exists:customers,id',
        ]);

        $tempPath   = null;
        $sheetIndex = (int) $request->sheet;
        $year       = (int) $request->year;
        $month      = (int) $request->month;
        $customer   = Customer::findOrFail($request->customer_id);

        DB::beginTransaction();

        try {
            $tempPath    = $this->storeTempFile($request->file('file'));
            $fileHash    = $this->calculateFileHash($tempPath);
            
            $reader      = $this->createReader($tempPath);
            $spreadsheet = $reader->load($tempPath);
            $worksheet   = $spreadsheet->getSheet($sheetIndex);

            if ($worksheet === null) {
                return response()->json(['success' => false, 'error' => 'Sheet tidak valid.'], 400);
            }

            // Pilih parser berdasarkan customer code
            $timeChartData = $this->parseByCustomer(
                $worksheet, $year, $month, strtoupper($customer->code)
            );

            if (empty($timeChartData)) {
                return response()->json([
                    'success' => false,
                    'error'   => 'Tidak ada data time chart yang valid untuk bulan ' . $month . '/' . $year . '. '
                               . 'Pastikan kolom dan format file sesuai dengan customer ' . $customer->code . '.',
                ], 400);
            }

            // Cek apakah file sudah pernah diupload (dari file_hash yang sama)
            $existingHash = TimeChart::where('year', $year)
                ->where('month', $month)
                ->where('file_hash', $fileHash)
                ->first();

            if ($existingHash) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error'   => 'File ini sudah pernah diupload untuk bulan ' . $month . '/' . $year . '. '
                               . 'Silakan upload file yang berbeda jika ingin update.',
                ], 400);
            }

            // UPSERT LOGIC: UPDATE jika sudah ada, INSERT jika baru
            // Ini mencegah duplikasi berkat unique constraint (year, month, week_number)
            $uploadBatch  = 'TC_' . $year . '_' . str_pad($month, 2, '0', STR_PAD_LEFT) . '_' . time();
            $originalName = $request->file('file')->getClientOriginalName();
            $insertCount  = 0;
            $updateCount  = 0;

            foreach ($timeChartData as $data) {
                $existing = TimeChart::where('year', $year)
                    ->where('month', $month)
                    ->where('week_number', $data['week_number'])
                    ->first();

                if ($existing) {
                    // UPDATE: Ganti data dengan yang baru
                    $existing->update([
                        'start_date'         => $data['start_date'],
                        'end_date'           => $data['end_date'],
                        'working_days'       => $data['working_days'],
                        'total_working_days' => count($data['working_days']),
                        'source_file'        => $originalName,
                        'file_hash'          => $fileHash,
                        'upload_batch'       => $uploadBatch,
                        'last_upload_at'     => now(),
                    ]);
                    $updateCount++;
                } else {
                    // INSERT: Buat entry baru
                    TimeChart::create([
                        'year'               => $year,
                        'month'              => $month,
                        'week_number'        => $data['week_number'],
                        'start_date'         => $data['start_date'],
                        'end_date'           => $data['end_date'],
                        'working_days'       => $data['working_days'],
                        'total_working_days' => count($data['working_days']),
                        'source_file'        => $originalName,
                        'file_hash'          => $fileHash,
                        'upload_batch'       => $uploadBatch,
                        'last_upload_at'     => now(),
                    ]);
                    $insertCount++;
                }
            }

            DB::commit();

            $totalProcessed = $insertCount + $updateCount;
            $message = $totalProcessed . ' minggu berhasil diproses dari file ' . $customer->code . '.';
            if ($insertCount > 0 && $updateCount > 0) {
                $message .= " ($insertCount baru, $updateCount update)";
            } elseif ($updateCount > 0) {
                $message .= " (semua update)";
            }

            return response()->json([
                'success' => true,
                'message' => $message,
                'data'    => [
                    'upload_batch'    => $uploadBatch,
                    'total_weeks'     => $totalProcessed,
                    'inserted'        => $insertCount,
                    'updated'         => $updateCount,
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('TimeChart upload error: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json(['success' => false, 'error' => 'Gagal memproses: ' . $e->getMessage()], 500);
        } finally {
            if ($tempPath && file_exists($tempPath)) @unlink($tempPath);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // PARSERS — tambah case baru di sini jika ada customer baru
    // ─────────────────────────────────────────────────────────────────────

    private function parseByCustomer($worksheet, int $year, int $month, string $code): array
    {
        return match ($code) {
            'TYC'   => $this->parseTYC($worksheet, $year, $month),
            'YNA'   => $this->parseYNA($worksheet, $year, $month),
            'SAI'   => $this->parseSAI($worksheet, $year, $month),
            'YC'    => $this->parseYC($worksheet, $year, $month),
            default => $this->parseGeneric($worksheet, $year, $month),
        };
    }

    /**
     * Generic parser: kolom TC SEQ + SR ISSUE DATE / ETD PORT
     * Digunakan sebagai fallback dan basis semua parser spesifik.
     */
    private function parseGeneric($worksheet, int $year, int $month): array
    {
        $highestRow      = $worksheet->getHighestRow();
        $highestColIndex = Coordinate::columnIndexFromString($worksheet->getHighestColumn());

        $headers = [];
        for ($col = 1; $col <= $highestColIndex; $col++) {
            $headers[$col] = strtoupper(trim((string) $worksheet->getCellByColumnAndRow($col, 1)->getValue()));
        }

        $tcSeqCol       = array_search('TC SEQ', $headers);
        $srIssueDateCol = array_search('SR ISSUE DATE', $headers);
        $etdPortCol     = array_search('ETD PORT', $headers);

        if (!$tcSeqCol) {
            throw new \Exception(
                'Kolom TC SEQ tidak ditemukan. Header yang tersedia: ' . implode(', ', array_values($headers))
            );
        }
        if (!$srIssueDateCol && !$etdPortCol) {
            throw new \Exception('Kolom SR ISSUE DATE atau ETD PORT harus ada.');
        }

        $data = [];

        for ($row = 2; $row <= $highestRow; $row++) {
            $tcSeq = $worksheet->getCellByColumnAndRow($tcSeqCol, $row)->getValue();
            if (!$tcSeq) continue;

            $rawDate = $srIssueDateCol
                ? $worksheet->getCellByColumnAndRow($srIssueDateCol, $row)->getValue()
                : null;

            if (!$rawDate && $etdPortCol) {
                $rawDate = $worksheet->getCellByColumnAndRow($etdPortCol, $row)->getValue();
            }

            $workingDate = $this->parseDate($rawDate);
            if (!$workingDate || $workingDate->year != $year || $workingDate->month != $month) continue;

            $weekNumber = (int) $tcSeq;

            if (!isset($data[$weekNumber])) {
                $data[$weekNumber] = [
                    'week_number'  => $weekNumber,
                    'working_days' => [],
                    'start_date'   => $workingDate,
                    'end_date'     => $workingDate,
                ];
            }

            $dateStr = $workingDate->format('Y-m-d');
            if (!in_array($dateStr, $data[$weekNumber]['working_days'])) {
                $data[$weekNumber]['working_days'][] = $dateStr;
            }

            if ($workingDate < $data[$weekNumber]['start_date']) $data[$weekNumber]['start_date'] = $workingDate;
            if ($workingDate > $data[$weekNumber]['end_date'])   $data[$weekNumber]['end_date']   = $workingDate;
        }

        return $this->finalizeWeeks($data);
    }

    /**
     * Parser TYC.
     * TODO: sesuaikan nama kolom / offset baris dengan format Excel TYC yang sebenarnya.
     */
    private function parseTYC($worksheet, int $year, int $month): array
    {
        // Contoh kustomisasi: ganti nama kolom jika berbeda
        // return $this->parseWithColumns($worksheet, $year, $month, 'WEEK', 'SHIP DATE');
        return $this->parseGeneric($worksheet, $year, $month);
    }

    /**
     * Parser YNA.
     * TODO: sesuaikan nama kolom / offset baris dengan format Excel YNA yang sebenarnya.
     */
    private function parseYNA($worksheet, int $year, int $month): array
    {
        return $this->parseGeneric($worksheet, $year, $month);
    }

    /**
     * Parser SAI.
     * TODO: sesuaikan nama kolom / offset baris dengan format Excel SAI yang sebenarnya.
     */
    private function parseSAI($worksheet, int $year, int $month): array
    {
        return $this->parseGeneric($worksheet, $year, $month);
    }

    /**
     * Parser YC.
     * TODO: sesuaikan nama kolom / offset baris dengan format Excel YC yang sebenarnya.
     */
    private function parseYC($worksheet, int $year, int $month): array
    {
        return $this->parseGeneric($worksheet, $year, $month);
    }

    /**
     * Helper parser dengan nama kolom custom.
     * Gunakan ini di dalam parseTYC/YNA/dll jika nama kolomnya berbeda.
     */
    private function parseWithColumns(
        $worksheet,
        int $year,
        int $month,
        string $weekColName,
        string $dateColName,
        int $headerRow = 1
    ): array {
        $highestRow      = $worksheet->getHighestRow();
        $highestColIndex = Coordinate::columnIndexFromString($worksheet->getHighestColumn());

        $headers = [];
        for ($col = 1; $col <= $highestColIndex; $col++) {
            $headers[$col] = strtoupper(trim((string) $worksheet->getCellByColumnAndRow($col, $headerRow)->getValue()));
        }

        $weekCol = array_search(strtoupper($weekColName), $headers);
        $dateCol = array_search(strtoupper($dateColName), $headers);

        if (!$weekCol || !$dateCol) {
            throw new \Exception(
                "Kolom '$weekColName' atau '$dateColName' tidak ditemukan. Header: " . implode(', ', array_values($headers))
            );
        }

        $data = [];

        for ($row = $headerRow + 1; $row <= $highestRow; $row++) {
            $weekVal = $worksheet->getCellByColumnAndRow($weekCol, $row)->getValue();
            $rawDate = $worksheet->getCellByColumnAndRow($dateCol, $row)->getValue();

            if (!$weekVal || !$rawDate) continue;

            $workingDate = $this->parseDate($rawDate);
            if (!$workingDate || $workingDate->year != $year || $workingDate->month != $month) continue;

            $weekNumber = (int) $weekVal;

            if (!isset($data[$weekNumber])) {
                $data[$weekNumber] = [
                    'week_number'  => $weekNumber,
                    'working_days' => [],
                    'start_date'   => $workingDate,
                    'end_date'     => $workingDate,
                ];
            }

            $dateStr = $workingDate->format('Y-m-d');
            if (!in_array($dateStr, $data[$weekNumber]['working_days'])) {
                $data[$weekNumber]['working_days'][] = $dateStr;
            }

            if ($workingDate < $data[$weekNumber]['start_date']) $data[$weekNumber]['start_date'] = $workingDate;
            if ($workingDate > $data[$weekNumber]['end_date'])   $data[$weekNumber]['end_date']   = $workingDate;
        }

        return $this->finalizeWeeks($data);
    }

    // ─────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────

    private function finalizeWeeks(array $data): array
    {
        ksort($data);
        foreach ($data as &$weekData) {
            sort($weekData['working_days']);
        }
        return array_values($data);
    }

    private function parseDate($dateValue): ?Carbon
    {
        if (!$dateValue) return null;
        try {
            if (is_numeric($dateValue)) {
                return Carbon::createFromTimestamp(($dateValue - 25569) * 86400)->startOfDay();
            }
            return Carbon::parse($dateValue)->startOfDay();
        } catch (\Exception $e) {
            return null;
        }
    }

    private function storeTempFile(UploadedFile $file): string
    {
        $dir = storage_path('app/temp');
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $path = $dir . '/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        $file->move($dir, basename($path));
        return $path;
    }

    private function createReader(string $filePath): \PhpOffice\PhpSpreadsheet\Reader\IReader
    {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        return match ($ext) {
            'xlsx', 'xlsm' => IOFactory::createReader('Xlsx'),
            'xls'          => IOFactory::createReader('Xls'),
            default        => throw new \Exception('Format tidak didukung: ' . $ext),
        };
    }

    /**
     * Hitung file hash untuk detect duplikasi file
     * SHA256 dari file contents untuk akurasi tinggi
     */
    private function calculateFileHash(string $filePath): string
    {
        return hash_file('sha256', $filePath);
    }
}