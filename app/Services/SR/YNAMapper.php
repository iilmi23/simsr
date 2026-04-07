<?php

namespace App\Services\SR;

use Illuminate\Support\Facades\Log;
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
 *     +1  F='YNA Part#'         H='YNA Part Description'  I=<part_number>
 *     +2  F='Customer Part#'
 *     +3  F='High Fab'          I='ETD Date'  J..=tanggal ETD per kolom
 *     +4  F='High Raw'          I='ETA Date'  J..=tanggal ETA per kolom
 *     +5  F='Car line'          I='Net'       J..=qty per kolom
 *     +6  F='Family'            I='Cum'
 *     +7  F='Cum Received'
 *     +8  F='Comments'
 *     +9  (blank separator)
 *
 *   Kolom data (J onward = index 9+):
 *     - Setiap kolom = satu minggu pengiriman
 *     - ETD dan Net SELALU ada; ETA sering kosong → fallback = ETD + 42 hari
 *     - Tidak ada label FIRM/FORECAST → semua di-set 'FIRM'
 *
 * WINDOW FILTER (sama dengan TYC):
 *   FIRM → sebulan sebelumnya + bulan berjalan
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
        int     $sheetIndex = 0
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

        return $this->mapFromFile($filePath, $referenceDate);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE — Main mapping logic
    // ─────────────────────────────────────────────────────────────────────

    private function mapFromFile(string $filePath, ?Carbon $referenceDate): array
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

        // Tentukan reference date untuk window filter
        $ref = $referenceDate ?? Carbon::now();
        $windowStart = $ref->copy()->subMonth()->startOfMonth();
        $windowEnd   = $ref->copy()->endOfMonth();

        Log::info("Reference: {$ref->toDateString()} | Window: {$windowStart->format('Y-m')} ~ {$windowEnd->format('Y-m')}");

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
                $records = $this->parseBlock($allRows, $psaIdx, $windowStart, $windowEnd);

                if (!empty($records)) {
                    $result        = array_merge($result, $records);
                    $processedParts++;
                } else {
                    $skippedParts++;
                    Log::debug("Block row " . ($psaIdx + 1) . " tidak punya data dalam window.");
                }
            } catch (\Throwable $e) {
                Log::warning("Error parsing block di row " . ($psaIdx + 1) . ": " . $e->getMessage());
                $skippedParts++;
            }
        }

        Log::info("Processed blocks: {$processedParts} | Skipped: {$skippedParts} | Records: " . count($result));

        if (empty($result)) {
            throw new \Exception(
                "Tidak ada data QTY > 0 dalam window " .
                "{$windowStart->format('Y-m')} ~ {$windowEnd->format('Y-m')}. " .
                "Total blocks: " . count($psaIndices) . "."
            );
        }

        return $result;
    }

    /**
     * Parse satu blok part (10 baris mulai dari PSA# row).
     *
     * @param array  $allRows    Semua baris sheet
     * @param int    $psaIdx     Index baris PSA# (0-based)
     * @param Carbon $windowStart Awal window filter
     * @param Carbon $windowEnd   Akhir window filter
     * @return array Records yang masuk window
     */
    private function parseBlock(array $allRows, int $psaIdx, Carbon $windowStart, Carbon $windowEnd): array
    {
        $records = [];

        // Validasi ketersediaan semua baris blok
        if (!isset($allRows[$psaIdx + 5])) {
            Log::debug("Block di row " . ($psaIdx + 1) . " tidak lengkap, skip.");
            return [];
        }

        // +1: YNA Part Description (col I = index 8)
        $descRow     = $allRows[$psaIdx + 1];
        $partNumber  = $this->cleanString($descRow[8] ?? null);

        // Validasi: pastikan ini benar-benar row YNA Part Description
        $descLabel = $this->cleanString($descRow[7] ?? null); // col H
        if ($descLabel !== 'YNA Part Description' || empty($partNumber)) {
            Log::debug("Block row " . ($psaIdx + 1) . ": bukan YNA Part Description atau part kosong. H='{$descLabel}' I='{$partNumber}'");
            return [];
        }

        // +3: ETD Date row (col I = 'ETD Date', col J+ = tanggal ETD)
        $etdRow      = $allRows[$psaIdx + 3];
        $etdLabel    = $this->cleanString($etdRow[8] ?? null); // col I

        // +4: ETA Date row (col I = 'ETA Date', col J+ = tanggal ETA)
        $etaRow      = $allRows[$psaIdx + 4];
        $etaLabel    = $this->cleanString($etaRow[8] ?? null); // col I

        // +5: Net row (col I = 'Net', col J+ = qty)
        $netRow      = $allRows[$psaIdx + 5];
        $netLabel    = $this->cleanString($netRow[8] ?? null); // col I

        // Validasi label
        if ($etdLabel !== 'ETD Date') {
            Log::warning("Block row " . ($psaIdx + 1) . ": ETD label tidak cocok, expected 'ETD Date' got '{$etdLabel}'");
            return [];
        }

        if ($netLabel !== 'Net') {
            Log::warning("Block row " . ($psaIdx + 1) . ": Net label tidak cocok, expected 'Net' got '{$netLabel}'");
            return [];
        }

        // Tentukan jumlah kolom data
        $maxCols = max(count($etdRow), count($netRow));

        for ($colIdx = self::DATA_COL_START; $colIdx < $maxCols; $colIdx++) {
            // Qty
            $qtyRaw = $netRow[$colIdx] ?? null;
            if ($qtyRaw === null || $qtyRaw === '' || $qtyRaw === '               ') continue;

            // Skip formula string
            if (is_string($qtyRaw) && str_starts_with(trim($qtyRaw), '=')) continue;

            $qty = $this->parseInteger($qtyRaw);
            if ($qty === null || $qty <= 0) continue;

            // ETD
            $etdRaw = $etdRow[$colIdx] ?? null;
            $etd    = $this->parseDateValue($etdRaw);
            if ($etd === null) continue; // ETD wajib ada

            // ETA — fallback ke ETD + 42 hari jika kosong
            $etaRaw = ($etaLabel === 'ETA Date') ? ($etaRow[$colIdx] ?? null) : null;
            $eta    = $this->parseDateValue($etaRaw) ?? $etd->copy()->addDays(self::ETA_FALLBACK_DAYS);

            // Window filter berdasarkan ETA
            if (!$eta->between($windowStart, $windowEnd)) {
                continue;
            }

            $records[] = [
                'customer'      => 'YNA',
                'source_file'   => null,
                'part_number'   => $partNumber,
                'qty'           => $qty,
                'delivery_date' => $eta->toDateString(),
                'eta'           => $eta->toDateString(),
                'etd'           => $etd->toDateString(),
                'week'          => $eta->format('W'),
                'month'         => $eta->format('Y-m'),
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
                ]),
            ];
        }

        return $records;
    }

    // ─────────────────────────────────────────────────────────────────────
    // PRIVATE — Detection helpers
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Temukan semua index baris yang merupakan anchor PSA# (F='PSA#').
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
        if ($value === null || $value === '') return null;

        // PhpSpreadsheet sudah mengembalikan DateTime object jika getCalculatedValue()
        if ($value instanceof \DateTime || $value instanceof \DateTimeImmutable) {
            return Carbon::instance($value)->startOfDay();
        }

        // Excel serial number
        if (is_float($value) || (is_int($value) && $value > 40000)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject($value);
                return Carbon::instance($dt)->startOfDay();
            } catch (\Throwable $e) {
                // fall through
            }
        }

        // String tanggal
        if (is_string($value)) {
            $value = trim($value);
            if (empty($value) || str_starts_with($value, '=') || $value === '               ') {
                return null;
            }

            $formats = ['Y-m-d', 'Y/m/d', 'd/m/Y', 'm/d/Y', 'd-m-Y'];
            foreach ($formats as $fmt) {
                try {
                    $d = Carbon::createFromFormat($fmt, $value);
                    if ($d) return $d->startOfDay();
                } catch (\Throwable $e) {
                    // try next
                }
            }

            try {
                return Carbon::parse($value)->startOfDay();
            } catch (\Throwable $e) {
                // ignore
            }
        }

        return null;
    }

    private function parseInteger($value): ?int
    {
        if ($value === null || $value === '') return null;
        if (is_int($value)) return $value;
        if (is_float($value)) return (int) round($value);

        $cleaned = preg_replace('/[^0-9\-]/', '', (string) $value);
        return is_numeric($cleaned) ? (int) $cleaned : null;
    }

    private function cleanString($value): string
    {
        if ($value === null) return '';
        return trim((string) $value);
    }
}