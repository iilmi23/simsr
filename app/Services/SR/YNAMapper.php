<?php

namespace App\Services\SR;

use Illuminate\Support\Facades\Log;
use App\Models\ProductionWeek;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * YNAMapper — mapper untuk customer YNA (Yazaki North America)
 *
 * STRUKTUR FILE (sheet "Final SR"):
 *   File tidak berbentuk tabel biasa. Setiap part dikemas dalam BLOK 10 BARIS:
 *
 *   Blok offset dari baris PSA# (anchor):
 *     +0  F='PSA#'              → anchor penanda awal blok baru
 *     +1  F='YNA Part#'   H='YNA Part Description'  I=<part_number>
 *     +2  F='Customer Part#'
 *     +3  F='High Fab'    I='ETD Date'  J..=tanggal ETD per kolom
 *     +4  F='High Raw'    I='ETA Date'  J..=tanggal ETA per kolom
 *     +5  F='Car line'    I='Net'       J..=qty per kolom
 *     +6  F='Family'      I='Cum'
 *     +7  F='Cum Received'
 *     +8  F='Comments'
 *     +9  (blank separator)
 *
 *   Kolom data (J onward = index 9+):
 *     - Setiap kolom = satu minggu pengiriman
 *     - ETD dan Net SELALU ada; ETA sering kosong → fallback = ETD + 42 hari
 *     - Tidak ada label FIRM/FORECAST → semua di-set 'FIRM'
 *
 * WINDOW FILTER:
 *   YNA mengambil semua tanggal ETD/ETA dari file,
 *   tanpa membatasi ke window FIRM/FORECAST.
 */
class YNAMapper implements SRMapperInterface
{
    // Kolom data mulai dari index 9 (kolom J di Excel)
    private const DATA_COL_START = 9;

    // Nama sheet yang dibaca
    private const SHEET_NAME = 'Final SR';

    // ETA fallback: ETD + N hari jika ETA row kosong
    private const ETA_FALLBACK_DAYS = 42;

    public function map(
        array   $sheet,
        ?Carbon $referenceDate = null,
        ?string $filePath = null,
        int     $sheetIndex = 0,
        ?int    $customerId = null
    ): array {
        if (empty($sheet) || !is_array($sheet)) {
            throw new \Exception("Sheet kosong atau tidak valid");
        }

        Log::info('=== MAPPING YNA START ===');

        // YNA harus dibaca dari file asli karena strukturnya vertical-block
        // $sheet dari Excel::toArray() mengandung formula string, bukan nilai terhitung
        // Kita pakai IOFactory untuk dapat nilai aktual
        if ($filePath === null || !file_exists($filePath)) {
            throw new \Exception(
                "YNAMapper membutuhkan filePath untuk membaca file Excel secara langsung. " .
                "Pastikan filePath diteruskan dari controller."
            );
        }

        return $this->mapFromFile($filePath, $referenceDate, $customerId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE — Main mapping logic
    // ─────────────────────────────────────────────────────────────────────

    private function mapFromFile(string $filePath, ?Carbon $referenceDate, ?int $customerId): array
    {
        // Load spreadsheet dengan kalkulasi formula
        $spreadsheet = IOFactory::load($filePath);

        // Cari sheet "Final SR"
        $worksheet = null;
        foreach ($spreadsheet->getWorksheetIterator() as $ws) {
            if (strtolower(trim($ws->getTitle())) === strtolower(self::SHEET_NAME)) {
                $worksheet = $ws;
                break;
            }
        }

        if ($worksheet === null) {
            // Fallback: coba sheet pertama
            $worksheet = $spreadsheet->getActiveSheet();
            Log::warning("Sheet '" . self::SHEET_NAME . "' tidak ditemukan, menggunakan sheet aktif: " . $worksheet->getTitle());
        }

        Log::info("Membaca sheet: " . $worksheet->getTitle());

        // Ambil semua baris sebagai array nilai
        $allRows = [];
        foreach ($worksheet->getRowIterator() as $row) {
            $rowData = [];
            foreach ($row->getCellIterator() as $cell) {
                $rowData[] = $cell->getCalculatedValue();
            }
            $allRows[] = $rowData;
        }

        Log::info("Total rows dibaca: " . count($allRows));

        // Tentukan reference date untuk log; YNA akan mengambil semua tanggal ETD/ETA dari file
        $ref = $referenceDate ?? Carbon::now();
        Log::info("Reference: {$ref->toDateString()} | YNA mapper mengambil semua kolom tanggal ETD/ETA tanpa window filter");

        // Temukan semua baris anchor PSA#
        $psaIndices = $this->findPsaRows($allRows);
        Log::info("Total part blocks ditemukan: " . count($psaIndices));

        if (empty($psaIndices)) {
            throw new \Exception(
                "Tidak dapat menemukan blok data di sheet '" . self::SHEET_NAME . "'. " .
                "Pastikan file YNA yang diunggah adalah format yang benar (harus ada baris dengan label 'PSA#')."
            );
        }

        $result = [];
        $processedParts  = 0;
        $skippedParts    = 0;

        foreach ($psaIndices as $psaIdx) {
            try {
                $records = $this->parseBlock($allRows, $psaIdx, $customerId);

                if (!empty($records)) {
                    $result        = array_merge($result, $records);
                    $processedParts++;
                } else {
                    $skippedParts++;
                    Log::debug("Block row " . ($psaIdx + 1) . " tidak punya data.");
                }
            } catch (\Throwable $e) {
                Log::warning("Error parsing block di row " . ($psaIdx + 1) . ": " . $e->getMessage());
                $skippedParts++;
            }
        }

        Log::info("Processed blocks: {$processedParts} | Skipped: {$skippedParts} | Records: " . count($result));

        if (empty($result)) {
            throw new \Exception(
                "Tidak ada data ETD/ETA yang valid di file YNA. " .
                "Total blocks: " . count($psaIndices) . "."
            );
        }

        return $result;
    }

    /**
     * Parse satu blok part (10 baris mulai dari PSA# row).
     *
     * Struktur kolom pada +1 row:
     *   col E (idx 4): 'YNA Part#'          — label penanda baris
     *   col H (idx 7): 'YNA Part Description' — header kolom deskripsi
     *   col I (idx 8): <actual_part_number>  — nilai yang kita ambil
     *
     * PERBAIKAN BUG: Sebelumnya validasi memeriksa descRow[7] === 'YNA Part Description',
     * padahal col H bisa berisi deskripsi part yang bebas (bukan teks literal tersebut).
     * Validasi yang benar adalah memeriksa label di col F (idx 5) = 'YNA Part#'.
     *
     * @param array  $allRows    Semua baris sheet
     * @param int    $psaIdx     Index baris PSA# (0-based)
     * @return array Records hasil parse blok
     */
    private function parseBlock(array $allRows, int $psaIdx, ?int $customerId = null): array
    {
        $records = [];

        // Validasi ketersediaan semua baris blok (minimal s/d +5)
        if (!isset($allRows[$psaIdx + 5])) {
            Log::debug("Block di row " . ($psaIdx + 1) . " tidak lengkap, skip.");
            return [];
        }

        // ── +1: ambil part number ────────────────────────────────────────
        $descRow    = $allRows[$psaIdx + 1];

        // BUG FIX: validasi menggunakan col F (idx 5) = 'YNA Part#', BUKAN col H
        // Col H (idx 7) berisi deskripsi bebas part, bukan teks literal 'YNA Part Description'
        $partLabel  = $this->cleanString($descRow[5] ?? null); // col F = label baris
        $partNumber = $this->cleanString($descRow[8] ?? null); // col I = nilai part number

        if ($partLabel !== 'YNA Part#') {
            Log::debug("Block row " . ($psaIdx + 1) . ": label +1 bukan 'YNA Part#', got '{$partLabel}', skip.");
            return [];
        }

        if (empty($partNumber)) {
            Log::debug("Block row " . ($psaIdx + 1) . ": part number kosong di col I, skip.");
            return [];
        }

        // ── +3: ETD Date row ─────────────────────────────────────────────
        $etdRow   = $allRows[$psaIdx + 3];
        $etdLabel = $this->cleanString($etdRow[8] ?? null); // col I

        // ── +4: ETA Date row ─────────────────────────────────────────────
        $etaRow   = $allRows[$psaIdx + 4];
        $etaLabel = $this->cleanString($etaRow[8] ?? null); // col I

        // ── +5: Net (qty) row ─────────────────────────────────────────────
        $netRow   = $allRows[$psaIdx + 5];
        $netLabel = $this->cleanString($netRow[8] ?? null); // col I

        // Validasi label ETD — wajib ada
        if ($etdLabel !== 'ETD Date') {
            Log::warning("Block row " . ($psaIdx + 1) . " part '{$partNumber}': ETD label tidak cocok, expected 'ETD Date' got '{$etdLabel}'");
            return [];
        }

        // Validasi label Net — wajib ada
        if ($netLabel !== 'Net') {
            Log::warning("Block row " . ($psaIdx + 1) . " part '{$partNumber}': Net label tidak cocok, expected 'Net' got '{$netLabel}'");
            return [];
        }

        // ETA label boleh tidak ada (akan fallback)
        $hasEtaRow = ($etaLabel === 'ETA Date');

        // ── Loop kolom data ───────────────────────────────────────────────
        $maxCols = max(count($etdRow), count($etaRow), count($netRow));

        for ($colIdx = self::DATA_COL_START; $colIdx < $maxCols; $colIdx++) {

            // ETD — wajib ada, skip kolom jika kosong
            $etdRaw = $etdRow[$colIdx] ?? null;
            $etd    = $this->parseDateValue($etdRaw);
            if ($etd === null) {
                continue;
            }

            // ETA — fallback ke ETD + 42 hari jika baris ETA tidak ada atau nilai kosong
            $etaRaw = $hasEtaRow ? ($etaRow[$colIdx] ?? null) : null;
            $eta    = $this->parseDateValue($etaRaw)
                      ?? $etd->copy()->addDays(self::ETA_FALLBACK_DAYS);

            // Qty — Parse dengan robust handling
            $qtyRaw = $netRow[$colIdx] ?? null;
            
            // Jika nilai kosong/spasi → qty = 0 (tapi jangan skip, tetap buat record dengan qty 0)
            if ($qtyRaw === null || $qtyRaw === '' || (is_string($qtyRaw) && trim($qtyRaw) === '')) {
                $qty = 0;
            } else {
                // Jika formula string (=...), coba parse integer (walau bisa gagal)
                // Jangan skip kolom, tapi catat di log bahwa qty potentially salah
                if (is_string($qtyRaw) && str_starts_with(trim($qtyRaw), '=')) {
                    $qty = $this->parseInteger($qtyRaw);
                    if ($qty === null) {
                        // Formula tidak bisa diparsing, default qty = 0
                        $qty = 0;
                        Log::warning("Block row " . ($psaIdx + 1) . " part '{$partNumber}' col " . ($colIdx + 1) . ": formula qty tidak terbaca, default 0. Raw: {$qtyRaw}");
                    } else {
                        Log::debug("Block row " . ($psaIdx + 1) . " part '{$partNumber}' col " . ($colIdx + 1) . ": formula qty terbaca: {$qty}");
                    }
                } else {
                    $qty = $this->parseInteger($qtyRaw) ?? 0;
                }
            }

            // Skip nilai negatif (data tidak valid / adjustment row)
            if ($qty < 0) {
                Log::debug("Block row " . ($psaIdx + 1) . " col " . ($colIdx + 1) . ": qty negatif ({$qty}), skip.");
                continue;
            }

            $weekInfo = $this->resolveWeekFromEtd($customerId, $etd);
            $records[] = [
                'customer'      => 'YNA',
                'source_file'   => null,
                'part_number'   => $partNumber,
                'qty'           => $qty,
                'delivery_date' => $eta->toDateString(),
                'eta'           => $eta->toDateString(),
                'etd'           => $etd->toDateString(),
                'week'          => $weekInfo['week'] ?? null,
                'month'         => $weekInfo['month'] ?? $eta->format('Y-m'),
                'order_type'    => 'FIRM',
                'model'         => null,
                'family'        => null,
                'route'         => null,
                'port'          => null,
                'extra'         => json_encode([
                    'row'          => $psaIdx + 1,
                    'col'          => $colIdx + 1,
                    'etd_raw'      => $etd->toDateString(),
                    'eta_fallback' => ($this->parseDateValue($etaRaw) === null),
                    'week_source'  => $weekInfo['source'] ?? 'manual',
                ]),
            ];
        }

        if (!empty($records)) {
            Log::debug("Block row " . ($psaIdx + 1) . " part '{$partNumber}': " . count($records) . " kolom parsed.");
        }

        return $records;
    }

    public function extractEtdRangeFromFile(string $filePath): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $worksheet = null;

        foreach ($spreadsheet->getWorksheetIterator() as $ws) {
            if (strtolower(trim($ws->getTitle())) === strtolower(self::SHEET_NAME)) {
                $worksheet = $ws;
                break;
            }
        }

        if ($worksheet === null) {
            $worksheet = $spreadsheet->getActiveSheet();
        }

        $allRows = [];
        foreach ($worksheet->getRowIterator() as $row) {
            $rowData = [];
            foreach ($row->getCellIterator() as $cell) {
                $rowData[] = $cell->getCalculatedValue();
            }
            $allRows[] = $rowData;
        }

        $dates = [];
        foreach ($this->findPsaRows($allRows) as $psaIdx) {
            $etdRow = $allRows[$psaIdx + 3] ?? [];
            foreach ($etdRow as $colIdx => $value) {
                $etd = $this->parseDateValue($value);
                if ($etd !== null) {
                    $dates[] = $etd->toDateString();
                }
            }
        }

        if (empty($dates)) {
            return [null, null];
        }

        return [min($dates), max($dates)];
    }

    /**
     * Extract week numbers mapping dari file YNA (jika ada di header atau label).
     * 
     * CATATAN: 
     * - File YNA standard tidak memiliki week label eksplisit
     * - Week number biasa di-resolve dari ProductionWeek berdasarkan ETD
     * - Method ini tersedia untuk future enhancement jika ada week label
     * 
     * @return array [ colIdx => weekNumber ]
     */
    public function extractWeekNumbersFromFile(string $filePath): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $worksheet = null;

        foreach ($spreadsheet->getWorksheetIterator() as $ws) {
            if (strtolower(trim($ws->getTitle())) === strtolower(self::SHEET_NAME)) {
                $worksheet = $ws;
                break;
            }
        }

        if ($worksheet === null) {
            $worksheet = $spreadsheet->getActiveSheet();
        }

        $allRows = [];
        foreach ($worksheet->getRowIterator() as $row) {
            $rowData = [];
            foreach ($row->getCellIterator() as $cell) {
                $rowData[] = $cell->getCalculatedValue();
            }
            $allRows[] = $rowData;
        }

        $weekMap = [];
        
        // Cari row yang kemungkinan memiliki week labels
        // Biasanya row pertama atau row sebelum data dimulai
        for ($rowIdx = 0; $rowIdx < min(5, count($allRows)); $rowIdx++) {
            $row = $allRows[$rowIdx];
            $weekCount = 0;
            
            // Scan kolom data (dari idx 9 = kolom J)
            for ($colIdx = self::DATA_COL_START; $colIdx < count($row); $colIdx++) {
                $cellVal = $this->cleanString($row[$colIdx] ?? '');
                
                // Cari pattern "Week 1", "W1", "Week1", "1", dll
                if (preg_match('/^w(?:eek)?\s*(\d+)$/i', $cellVal, $m)) {
                    $weekNum = (int) $m[1];
                    $weekMap[$colIdx] = $weekNum;
                    $weekCount++;
                } elseif (is_numeric($cellVal) && $cellVal > 0 && $cellVal < 53) {
                    // Angka murni 1-52 (week number)
                    $weekMap[$colIdx] = (int) $cellVal;
                    $weekCount++;
                }
            }
            
            // Jika found week labels konsisten (>= 3 weeks), gunakan ini
            if ($weekCount >= 3) {
                Log::info("Extract week numbers dari row " . ($rowIdx + 1) . ": " . count($weekMap) . " weeks found");
                return $weekMap;
            }
        }
        
        Log::debug("No explicit week labels found in file, will use ETD-based resolution");
        return [];
    }

    private function resolveWeekFromEtd(?int $customerId, Carbon $etd): array
    {
        $week = null;
        if ($customerId !== null) {
            $week = ProductionWeek::findByDate($customerId, $etd);
        }

        if ($week) {
            return [
                'week'   => $week->week_no,
                'month'  => $week->month_name,
                'year'   => $week->year,
                'source' => 'production_week',
            ];
        }

        return [
            'week'   => null,
            'month'  => $etd->format('Y-m'),
            'year'   => $etd->year,
            'source' => 'fallback',
        ];
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE — Detection helpers
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Temukan semua index baris yang merupakan anchor PSA# (col F = 'PSA#').
     */
    private function findPsaRows(array $allRows): array
    {
        $indices = [];
        foreach ($allRows as $idx => $row) {
            $fVal = $this->cleanString($row[5] ?? null); // col F = index 5
            if ($fVal === 'PSA#') {
                $indices[] = $idx;
            }
        }
        return $indices;
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE — Parse helpers
    // ─────────────────────────────────────────────────────────────────────

    private function parseDateValue($value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        // PhpSpreadsheet mengembalikan DateTime object jika getCalculatedValue()
        if ($value instanceof \DateTime || $value instanceof \DateTimeImmutable) {
            return Carbon::instance($value)->startOfDay();
        }

        // Excel serial number (float atau int > 40000)
        // Angka > 40000 adalah serial date mulai dari 1900
        if (is_float($value) || (is_int($value) && $value > 40000)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject($value);
                return Carbon::instance($dt)->startOfDay();
            } catch (\Throwable $e) {
                // fall through ke string parsing
                Log::debug("ExcelDate conversion failed for value: " . var_export($value, true));
            }
        }

        // String tanggal
        if (is_string($value)) {
            $value = trim($value);

            // Skip formula string, blank-ish string
            if (empty($value) || str_starts_with($value, '=')) {
                return null;
            }

            // Coba format standar lebih dulu (ketat)
            $formats = ['Y-m-d', 'Y/m/d', 'd/m/Y', 'm/d/Y', 'd-m-Y', 'n/j/Y', 'n/j/y'];
            foreach ($formats as $fmt) {
                try {
                    // BUG FIX: Carbon::createFromFormat bisa return false, bukan null/throw
                    $d = Carbon::createFromFormat($fmt, $value);
                    if ($d !== false && $d->format($fmt) === $value) {
                        return $d->startOfDay();
                    }
                } catch (\Throwable $e) {
                    // try next format
                }
            }

            // Last resort: Carbon::parse (sangat fleksibel tapi kurang strict)
            try {
                $parsed = Carbon::parse($value);
                // Sanity check: tahun harus masuk akal (2000-2100)
                if ($parsed->year >= 2000 && $parsed->year <= 2100) {
                    return $parsed->startOfDay();
                }
            } catch (\Throwable $e) {
                Log::debug("Date parsing failed for string: " . $value);
            }
        }

        return null;
    }

    private function parseInteger($value): ?int
    {
        if ($value === null || $value === '') return null;
        if (is_int($value)) return $value;
        if (is_float($value)) return (int) round($value);

        // Handle string dengan angka
        $strVal = (string) $value;
        $strVal = trim($strVal);

        // Skip formula string
        if (str_starts_with($strVal, '=')) {
            return null;
        }

        // Extract digits (allow negative)
        $cleaned = preg_replace('/[^0-9\-]/', '', $strVal);
        
        if (empty($cleaned)) return null;
        
        $int = (int) $cleaned;
        
        // Sanity check: qty tidak boleh sangat besar (> 1 juta)
        if (abs($int) > 1000000) {
            return null;
        }
        
        return $int;
    }

    private function cleanString($value): string
    {
        if ($value === null) return '';
        return trim((string) $value);
    }
}