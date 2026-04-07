<?php

namespace App\Services\SR;

use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * YCMapper — mapper untuk customer YC (YAZAKI), file format XLSM multi-sheet
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STRUKTUR FILE YC
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * File berisi 1–N sheet aktif (visible), masing-masing merupakan satu SR:
 *   - Sheet TK1  → SR No. BWJATK1BA260404  (sedikit part)
 *   - Sheet TR2  → SR No. BWJATR2BA260404  (banyak part)
 *   - Sheet TU1  → SR No. BWJATU1BA260404  (multi family group)
 *   Semua sheet identik formatnya → mapper memetakan tiap sheet dengan logika
 *   yang sama, lalu hasilnya di-merge menjadi satu array.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STRUKTUR TIAP SHEET (row index 0-based)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Row  1–6  (idx 0–5)  : HIDDEN — header fax Yazaki, diabaikan
 *  Row  7    (idx 6)    : SR No.             → B7
 *  Row  9    (idx 8)    : JPN FACT           → B9  (ex: "MKH 7300")
 *  Row 10    (idx 9)    : OVERSEAS FACT      → B10 (ex: "JAI 32G7")
 *  Row 11    (idx 10)   : ARRIVAL PORT (JPN) → B11 (ex: "HAKATA BA")
 *  Row 12    (idx 11)   : CUST GROUP CODE    → B12 (ex: "TOYOTA")
 *  Row 13    (idx 12)   : CUST               → B13 (bisa multiline, beberapa customer)
 *  Row 14    (idx 13)   : Tanggal CUST ETA TO (row header tanggal alternatif)
 *  Row 15    (idx 14)   : TIME CHART MONTH   → F15="TIME CHART MONTH", K15=3, O15=4, ...
 *                         Kolom dengan angka bulat = anchor bulan baru
 *  Row 16    (idx 15)   : CUST ETA [FROM]    → K16+ = tanggal ETA ke customer Jepang
 *  Row 17    (idx 16)   : ETA                → K17+ = tanggal ETA ke Jepang (departure JAI)
 *  Row 18    (idx 17)   : ETD                → K18+ = tanggal ETD dari JAI
 *  Row 19    (idx 18)   : SR ISSUE DATE      → K19+ (informatif, tidak dipakai)
 *  Row 20    (idx 19)   : HEADER kolom data  → A="CAR MODEL", B="FAMILY", C="JIG TYPE",
 *                         D="No.", E="PRODUCT NO", F-AH=week numbers (4,5,6,7,8,1,2,3,...),
 *                         AI="Route No."
 *  Row 21+   (idx 20+)  : DATA — pola selang-seling:
 *                           Baris ODD  = data QTY part number (E ada part number)
 *                           Baris EVEN = CUM (E kosong, D kosong, A/B/C kosong)
 *                           Baris TOTAL subgroup = B='TOTAL'
 *                           Baris TOTAL sheet    = A='TOTAL'
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * KOLOM DATA (0-based index)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Col A (0) : CAR MODEL   — hanya ada di baris pertama per model, di-inherit
 *  Col B (1) : FAMILY      — nama family, bisa berupa angka (jumlah packing), atau "TOTAL"
 *  Col C (2) : JIG TYPE    — J / JK / K / kosong
 *  Col D (3) : No.         — nomor urut part dalam sheet
 *  Col E (4) : PRODUCT NO  — part number (format: 8xxxx-xxxxx)
 *  Col F (5) – Col J (9)   : Kolom historis (week 4–8 bulan sebelumnya) → termasuk FIRM
 *  Col K (10) – Col AH (33): Kolom live (week 1+ current month → future) → FIRM/FORECAST
 *  Col AI (34): Route No.  — kode rute pengiriman (ex: WTK1A, WTR21, WTU11)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOGIKA FIRM vs FORECAST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Row 15 = TIME CHART MONTH: kolom yang memiliki angka integer = anchor awal bulan baru.
 *  Contoh (file ini):  K=3, O=4, S=5, V=6, AA=7, AE=8
 *    → Bulan 3 dimulai di col K (index 10)
 *    → Bulan 4 dimulai di col O (index 14)
 *    → dst.
 *
 *  Cols F–J (index 5–9): week 4–8 bulan sebelum TIME CHART pertama.
 *    → Tahun direkonstruksi dari TIME CHART: jika month pertama = 3 (Maret),
 *      maka bulan cols F-J = Februari → tahun = tahun TIME CHART.
 *
 *  Aturan window (identik TYC/SAI):
 *    FIRM     = bulan sebelumnya + bulan berjalan
 *    FORECAST = bulan berjalan + 4 bulan ke depan
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PERBEDAAN KUNCI vs TYC & SAI
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  | Aspek                  | TYC                  | SAI                  | YC                         |
 *  |------------------------|----------------------|----------------------|----------------------------|
 *  | Jumlah sheet           | 1                    | 1 ("List Order")     | 1–N (semua visible sheet)  |
 *  | Sheet detection        | By index             | By name              | Semua visible → merge      |
 *  | Data col start         | Cari anchor YYYY/M   | Col F (idx 5)        | Col K (idx 10), F-J = hist |
 *  | Time chart row         | Ada YYYY/M           | Tidak ada            | Row 15 (integer bulan)     |
 *  | ETD row label          | "ETD PORT SUR"       | "ETD : JAI"          | Row 18, F18="ETD"          |
 *  | ETA row label          | "ETA PORT KAO"       | "ETA : SAI"          | Row 17, F17="ETA"          |
 *  | Part number col        | "PRODUCT NO"         | "PART NUMBER" (B)    | "PRODUCT NO" (E, idx 4)    |
 *  | CUM rows               | Tidak ada            | Ada (C='CUM')        | Ada (E & D kosong)         |
 *  | TOTAL rows             | Tidak ada            | Tidak ada            | Ada A='TOTAL' / B='TOTAL'  |
 *  | Model/Family inherit   | Ada                  | Tidak ada            | Ada (model dari baris atas)|
 *  | Route field            | Tidak ada            | Tidak ada            | Ada col AI ("Route No.")   |
 *  | Historical cols        | Tidak ada            | Tidak ada            | Col F-J (w4-w8 prev month) |
 *  | Port                   | KAO                  | SAI                  | "HAKATA BA" dari row 11    |
 */
class YCMapper implements SRMapperInterface
{
    // Row indices (0-based)
    private const SR_NO_ROW         = 6;  // Row 7  Excel
    private const JPN_FACT_ROW      = 8;  // Row 9  Excel
    private const OVERSEAS_ROW      = 9;  // Row 10 Excel
    private const PORT_ROW          = 10; // Row 11 Excel
    private const CUST_GROUP_ROW    = 11; // Row 12 Excel
    private const CUST_ROW          = 12; // Row 13 Excel
    private const TIME_CHART_ROW    = 14; // Row 15 Excel — anchor bulan
    private const CUST_ETA_FROM_ROW = 15; // Row 16 Excel — CUST ETA [FROM]
    private const ETA_ROW           = 16; // Row 17 Excel — ETA (departure JAI)
    private const ETD_ROW           = 17; // Row 18 Excel — ETD dari JAI
    private const HEADER_ROW        = 19; // Row 20 Excel — kolom header
    private const DATA_START_ROW    = 20; // Row 21 Excel — baris data pertama

    // Kolom indices (0-based)
    private const COL_MODEL    = 0;  // A — CAR MODEL
    private const COL_FAMILY   = 1;  // B — FAMILY
    private const COL_JIG      = 2;  // C — JIG TYPE
    private const COL_NO       = 3;  // D — No.
    private const COL_PART     = 4;  // E — PRODUCT NO
    private const COL_HIST_START = 5;  // F — awal kolom historis (week 4)
    private const COL_HIST_END   = 9;  // J — akhir kolom historis (week 8)
    private const COL_LIVE_START = 10; // K — awal kolom live (week 1 bulan TIME CHART pertama)
    private const COL_ROUTE    = 34; // AI — Route No.

    // Kata skip
    private const SKIP_WORDS = ['total', 'subtotal', 'grand total'];

    public function map(array $sheet, ?Carbon $referenceDate = null, array $options = []): array
    {
        // YCMapper menerima $sheet sebagai array-of-sheets (multi-sheet)
        // karena satu file YC = beberapa sheet
        // Caller bertanggung jawab mem-pass semua sheet via $options['all_sheets']
        // atau langsung dari file menggunakan IOFactory.
        // Fallback: jika $sheet adalah single sheet array, wrap ke array.

        throw new \Exception(
            "YCMapper::map() tidak boleh dipanggil langsung. " .
            "Gunakan YCMapper::mapAllSheets() atau integrasikan via SRController."
        );
    }

    /**
     * Titik masuk utama: memetakan seluruh sheet visible dari satu file YC.
     *
     * @param  array<int, array>  $allSheets   Hasil Excel::toArray() — semua sheet
     * @param  array<int, string> $sheetNames  Nama tiap sheet (dari IOFactory atau Maatwebsite)
     * @param  array<int, bool>   $hiddenSheets Hidden state tiap sheet (0-based index)
     * @param  Carbon|null        $referenceDate Override reference date
     * @param  array              $options      hidden_columns, hidden_rows per sheet (opsional)
     * @return array              Flat array semua record dari semua sheet
     */
    public function mapAllSheets(
        array   $allSheets,
        array   $sheetNames,
        array   $hiddenSheets = [],
        ?Carbon $referenceDate = null,
        array   $options = []
    ): array {
        $result = [];

        foreach ($allSheets as $sheetIndex => $sheetData) {
            // Skip sheet yang hidden
            if (!empty($hiddenSheets[$sheetIndex])) {
                Log::info("YCMapper: skip hidden sheet index={$sheetIndex}");
                continue;
            }

            $sheetName    = $sheetNames[$sheetIndex] ?? "Sheet{$sheetIndex}";
            $sheetOptions = $options[$sheetIndex] ?? $options;

            Log::info("YCMapper: mapping sheet [{$sheetIndex}] '{$sheetName}'");

            try {
                $sheetResult = $this->mapSingleSheet($sheetData, $sheetName, $referenceDate, $sheetOptions);
                $result      = array_merge($result, $sheetResult);

                Log::info("YCMapper: sheet '{$sheetName}' → " . count($sheetResult) . " records");
            } catch (\Exception $e) {
                // Satu sheet gagal tidak membatalkan seluruh proses
                Log::warning("YCMapper: sheet '{$sheetName}' gagal — " . $e->getMessage());
            }
        }

        Log::info("YCMapper: total records semua sheet = " . count($result));

        return $result;
    }

    /**
     * Memetakan satu sheet YC.
     *
     * @param  array       $sheet        Array 0-based rows dari satu sheet
     * @param  string      $sheetName    Nama sheet (untuk logging & extra field)
     * @param  Carbon|null $referenceDate
     * @param  array       $options      hidden_columns, hidden_rows
     */
    public function mapSingleSheet(
        array   $sheet,
        string  $sheetName,
        ?Carbon $referenceDate = null,
        array   $options = []
    ): array {
        $result = [];

        if (empty($sheet) || !is_array($sheet)) {
            throw new \Exception("Sheet '{$sheetName}' kosong");
        }

        // ── 1. Baca metadata sheet ────────────────────────────────────────────
        $srNo     = trim((string) ($sheet[self::SR_NO_ROW][1]         ?? ''));
        $jpnFact  = trim((string) ($sheet[self::JPN_FACT_ROW][1]      ?? ''));
        $overseas = trim((string) ($sheet[self::OVERSEAS_ROW][1]      ?? ''));
        $port     = trim((string) ($sheet[self::PORT_ROW][1]          ?? ''));
        $custGrp  = trim((string) ($sheet[self::CUST_GROUP_ROW][1]    ?? ''));
        $custRaw  = trim((string) ($sheet[self::CUST_ROW][1]          ?? ''));

        Log::info("YCMapper [{$sheetName}]: SR={$srNo}, PORT={$port}, CUST={$custRaw}");

        // ── 2. Deteksi baris kunci ────────────────────────────────────────────
        $timeChartRow    = $this->detectRowByLabel($sheet, 'TIME CHART MONTH', self::TIME_CHART_ROW, 5)
            ?? $sheet[self::TIME_CHART_ROW] ?? [];
        $etdRow          = $this->detectRowByLabel($sheet, 'ETD', self::ETD_ROW, 1)
            ?? $sheet[self::ETD_ROW] ?? [];
        $etaRow          = $this->detectRowByLabel($sheet, 'ETA', self::ETA_ROW, 1)
            ?? $sheet[self::ETA_ROW] ?? [];
        $headerRowIdx    = $this->detectHeaderRowIndex($sheet) ?? self::HEADER_ROW;
        $dataStartRow    = $headerRowIdx + 1;

        // ── 3. Reference date & window ────────────────────────────────────────
        $sheetReference  = $referenceDate ?? $this->guessReferenceDate($etdRow, $timeChartRow) ?? Carbon::now();
        $ref             = $sheetReference;
        $firmStart       = $ref->copy()->subMonth()->startOfMonth();
        $firmEnd         = $ref->copy()->endOfMonth();
        $forecastStart   = $ref->copy()->startOfMonth();
        $forecastEnd     = $ref->copy()->addMonths(4)->endOfMonth();

        Log::info("YCMapper [{$sheetName}]: ref={$ref->toDateString()}, FIRM={$firmStart->format('Y-m')}~{$firmEnd->format('Y-m')}, FORECAST={$forecastStart->format('Y-m')}~{$forecastEnd->format('Y-m')}");

        // ── 4. Hidden options ─────────────────────────────────────────────────
        $hiddenColumns = array_flip($options['hidden_columns'] ?? []);
        $hiddenRows    = array_flip($options['hidden_rows']    ?? []);

        // ── 5. Bangun peta kolom tanggal aktif ────────────────────────────────
        $dateColumns = $this->buildDateColumns(
            $timeChartRow,
            $etdRow,
            $etaRow,
            $firmStart, $firmEnd,
            $forecastStart, $forecastEnd,
            $hiddenColumns
        );

        if (empty($dateColumns)) {
            throw new \Exception(
                "Sheet '{$sheetName}': tidak ada kolom tanggal dalam window. " .
                "FIRM: {$firmStart->format('Y-m')} ~ {$firmEnd->format('Y-m')}, " .
                "FORECAST: {$forecastStart->format('Y-m')} ~ {$forecastEnd->format('Y-m')}."
            );
        }

        Log::info("YCMapper [{$sheetName}]: " . count($dateColumns) . " kolom aktif");

        // ── 6. Loop baris data ────────────────────────────────────────────────
        $lastModel  = null;
        $lastFamily = null;
        $processedRows = 0;

        for ($i = $dataStartRow; $i < count($sheet); $i++) {
            if (isset($hiddenRows[$i])) {
                continue;
            }

            $row = $sheet[$i];
            if (!is_array($row)) {
                continue;
            }

            $colA = trim((string) ($row[self::COL_MODEL]  ?? ''));
            $colB = trim((string) ($row[self::COL_FAMILY] ?? ''));
            $colE = trim((string) ($row[self::COL_PART]   ?? ''));

            // ── Stop di baris TOTAL level sheet ──────────────────────────────
            if (strtolower($colA) === 'total') {
                break;
            }

            // ── Skip baris TOTAL subgroup dan baris CUM ───────────────────────
            if (strtolower($colB) === 'total') {
                continue;
            }

            // CUM row: E kosong dan D kosong
            $colD = $row[self::COL_NO] ?? null;
            if ($colE === '' && ($colD === null || $colD === '')) {
                continue;
            }

            // ── Skip baris non-part (family group header) ─────────────────────
            // Baris seperti: A='TK1', B='45', C='', D=null, E=null → family header
            if ($colE === '' && $colD === null) {
                continue;
            }

            // ── Validasi part number ──────────────────────────────────────────
            if ($colE === '') {
                continue;
            }
            if (in_array(strtolower($colE), self::SKIP_WORDS, true)) {
                continue;
            }

            // ── Inherit model dan family ──────────────────────────────────────
            if ($colA !== '') {
                $lastModel = $colA;
            }
            // Family hanya update jika bukan angka (angka = packing qty family header)
            if ($colB !== '' && !is_numeric($colB) && strtolower($colB) !== 'total') {
                $lastFamily = $colB;
            }

            $processedRows++;

            $jigType = trim((string) ($row[self::COL_JIG]   ?? '')) ?: null;
            $no      = $row[self::COL_NO]    ?? null;
            $route   = trim((string) ($row[self::COL_ROUTE]  ?? '')) ?: null;

            // ── Ambil QTY per kolom aktif ─────────────────────────────────────
            foreach ($dateColumns as $colIndex => $info) {
                $qty = $row[$colIndex] ?? null;

                if ($qty === null || $qty === '') {
                    continue;
                }
                if (is_string($qty) && str_starts_with($qty, '=')) {
                    continue;
                }

                $qty = is_string($qty)
                    ? (int) preg_replace('/[^0-9\-]/', '', $qty)
                    : (int) $qty;

                if ($qty <= 0) {
                    continue;
                }

                $result[] = [
                    'customer'      => 'YC',
                    'source_file'   => null,
                    'part_number'   => $colE,
                    'qty'           => $qty,
                    'delivery_date' => $info['eta']->toDateString(),
                    'eta'           => $info['eta']->toDateString(),
                    'etd'           => $info['etd']->toDateString(),
                    'week'          => $info['week_label'],
                    'month'         => $info['month'],
                    'order_type'    => $info['type'],
                    'model'         => $lastModel,
                    'family'        => $lastFamily,
                    'route'         => $route,
                    'port'          => $port ?: 'HAKATA BA',
                    'extra'         => json_encode([
                        'row'         => $i + 1,
                        'sheet'       => $sheetName,
                        'sr_no'       => $srNo,
                        'no'          => $no,
                        'jig_type'    => $jigType,
                        'week_label'  => $info['week_label'],
                        'col'         => $colIndex + 1,
                        'jpn_fact'    => $jpnFact,
                        'overseas'    => $overseas,
                        'cust_group'  => $custGrp,
                        'cust'        => $custRaw,
                    ]),
                ];
            }
        }

        Log::info("YCMapper [{$sheetName}]: processed_rows={$processedRows}, records=" . count($result));

        return $result;
    }

    // =========================================================================
    // PRIVATE — Column Map Builder
    // =========================================================================

    /**
     * Bangun peta kolom aktif.
     *
     * LOGIKA KHUSUS YC:
     *
     * 1. KOLOM HISTORIS (F–J, index 5–9):
     *    Mewakili week 4–8 dari bulan sebelum TIME CHART pertama.
     *    Tahun di-resolve dari anchor TIME CHART.
     *    ETD & ETA diambil langsung dari row 18 & 17.
     *
     * 2. KOLOM LIVE (K+, index 10+):
     *    Row 15 (TIME CHART MONTH) berisi integer angka bulan di kolom
     *    pertama setiap bulan baru. Kolom tanpa angka → inherit bulan sebelumnya.
     *    Rekonstruksi tahun: jika bulan turun (mis. 12→1) → tahun +1.
     *
     * 3. WEEK LABEL:
     *    Row 20 berisi nomor week (1,2,3,4,5). Digunakan sebagai label.
     *
     * 4. FILTER WINDOW: identik TYC/SAI.
     */
    private function buildDateColumns(
        array  $timeChartRow,
        array  $etdRow,
        array  $etaRow,
        Carbon $firmStart,
        Carbon $firmEnd,
        Carbon $forecastStart,
        Carbon $forecastEnd,
        array  $hiddenColumns = []
    ): array {
        $columns     = [];
        $skipped     = [];

        // ── Bangun peta month dari TIME CHART row ─────────────────────────────
        // Key = col index (0-based), Value = month integer
        $monthAnchors = [];
        foreach ($timeChartRow as $col => $val) {
            if ($col < self::COL_LIVE_START) {
                continue;
            }
            if ($val !== null && $val !== '' && is_numeric($val) && (int) $val >= 1 && (int) $val <= 12) {
                $monthAnchors[$col] = (int) $val;
            }
        }

        if (empty($monthAnchors)) {
            Log::warning('YCMapper: TIME CHART MONTH anchors tidak ditemukan, fallback ke referenceDate');
        }

        // Resolve tahun dari anchor pertama TIME CHART
        $firstAnchorCol   = !empty($monthAnchors) ? min(array_keys($monthAnchors)) : self::COL_LIVE_START;
        $firstAnchorMonth = $monthAnchors[$firstAnchorCol] ?? Carbon::now()->month;
        $baseYear         = $this->resolveBaseYear($firstAnchorMonth, $etdRow, $firstAnchorCol);

        // ── FASE 1: Kolom historis F–J (index 5–9) ────────────────────────────
        // Bulan = bulan sebelum anchor pertama TIME CHART
        $prevMonth     = $firstAnchorMonth === 1 ? 12 : $firstAnchorMonth - 1;
        $prevMonthYear = $firstAnchorMonth === 1 ? $baseYear - 1 : $baseYear;

        for ($col = self::COL_HIST_START; $col <= self::COL_HIST_END; $col++) {
            if (isset($hiddenColumns[$col])) {
                continue;
            }

            $etdDate = $this->parseDateValue($etdRow[$col] ?? null);
            if ($etdDate === null) {
                continue;
            }

            $etaDate = $this->parseDateValue($etaRow[$col] ?? null) ?? $etdDate->copy()->addDays(14);

            // Koreksi tahun berdasarkan konteks
            $etdDate = $this->normalizeYear($etdDate, $prevMonthYear);
            $etaDate = $this->normalizeYear($etaDate, $prevMonthYear);

            $colMonth    = Carbon::create($prevMonthYear, $prevMonth, 1);
            $colMonthStr = $colMonth->format('Y-m');
            $weekLabel   = 'W' . ($col - self::COL_HIST_START + 4); // W4, W5, W6, W7, W8

            $inWindow = $colMonth->between($firmStart, $firmEnd);
            $type     = 'FIRM'; // Kolom historis selalu FIRM

            $entry = [
                'etd'        => $etdDate,
                'eta'        => $etaDate,
                'type'       => $type,
                'week_label' => $weekLabel,
                'month'      => $colMonthStr,
            ];

            if ($inWindow) {
                $columns[$col] = $entry;
            } else {
                $skipped[$col] = $entry;
            }
        }

        // ── FASE 2: Kolom live K+ (index 10+) ────────────────────────────────
        $currentMonth = null;
        $currentYear  = $baseYear;
        $lastMonth    = null;

        $maxCol = max(
            count($timeChartRow),
            count($etdRow),
            count($etaRow)
        ) - 1;

        for ($col = self::COL_LIVE_START; $col <= $maxCol; $col++) {
            if (isset($hiddenColumns[$col])) {
                continue;
            }

            // Update anchor bulan jika ada di TIME CHART row
            if (isset($monthAnchors[$col])) {
                $month = $monthAnchors[$col];
                // Rekonstruksi tahun: bulan turun = tahun baru
                if ($lastMonth !== null && $month < $lastMonth) {
                    $currentYear++;
                }
                $currentMonth = $month;
                $lastMonth    = $month;
            }

            if ($currentMonth === null) {
                // Belum ada konteks → skip
                continue;
            }

            $etdDate = $this->parseDateValue($etdRow[$col] ?? null);
            if ($etdDate === null) {
                continue;
            }

            $etaDate = $this->parseDateValue($etaRow[$col] ?? null) ?? $etdDate->copy()->addDays(14);

            // Koreksi tahun
            $etdDate = $this->normalizeYear($etdDate, $currentYear);
            $etaDate = $this->normalizeYear($etaDate, $currentYear);

            $colMonth    = Carbon::create($currentYear, $currentMonth, 1);
            $colMonthStr = $colMonth->format('Y-m');

            // Week label dari TIME CHART row (integer 1–5)
            // Jika tidak ada angka di kolom ini, hitung dari urutan sejak anchor
            $weekVal   = $timeChartRow[$col] ?? null;
            $weekLabel = ($weekVal !== null && is_numeric($weekVal) && (int)$weekVal >= 1 && (int)$weekVal <= 5)
                ? 'W' . (int) $weekVal
                : 'W?';

            // Determine FIRM vs FORECAST
            $type     = $colMonth->between($firmStart, $firmEnd) ? 'FIRM' : 'FORECAST';

            $inWindow = match ($type) {
                'FIRM'     => $colMonth->between($firmStart,     $firmEnd),
                'FORECAST' => $colMonth->between($forecastStart, $forecastEnd),
                default    => false,
            };

            $entry = [
                'etd'        => $etdDate,
                'eta'        => $etaDate,
                'type'       => $type,
                'week_label' => $weekLabel,
                'month'      => $colMonthStr,
            ];

            if ($inWindow) {
                $columns[$col] = $entry;
            } else {
                $skipped[$col] = $entry;
            }
        }

        // Fallback: jika window kosong, pakai semua parsed columns
        if (empty($columns) && !empty($skipped)) {
            Log::warning('YCMapper: window kosong, fallback ke semua kolom tersedia.');
            return $skipped;
        }

        return $columns;
    }

    // =========================================================================
    // PRIVATE — Row Detection
    // =========================================================================

    /**
     * Deteksi baris berdasarkan label di kolom tertentu.
     */
    private function detectRowByLabel(
        array  $sheet,
        string $label,
        int    $defaultIdx,
        int    $labelCol = 0,
        int    $maxRows  = 25
    ): ?array {
        $limit = min(count($sheet), $maxRows);
        for ($i = 0; $i < $limit; $i++) {
            $row = $sheet[$i];
            if (!is_array($row)) {
                continue;
            }
            $cellVal = strtoupper(trim((string) ($row[$labelCol] ?? '')));
            if (str_contains($cellVal, strtoupper($label))) {
                return $row;
            }
        }
        return null;
    }

    /**
     * Deteksi indeks baris header (row yang mengandung "PRODUCT NO" di kolom E).
     */
    private function detectHeaderRowIndex(array $sheet, int $maxRows = 25): ?int
    {
        $limit = min(count($sheet), $maxRows);
        for ($i = 0; $i < $limit; $i++) {
            $row = $sheet[$i];
            if (!is_array($row)) {
                continue;
            }
            $e = strtoupper(trim((string) ($row[self::COL_PART] ?? '')));
            if ($e === 'PRODUCT NO' || $e === 'PRODUCT NO.') {
                return $i;
            }
        }
        return null;
    }

    // =========================================================================
    // PRIVATE — Date & Year Helpers
    // =========================================================================

    /**
     * Tebak reference date dari ETD row atau TIME CHART row.
     * Ambil tanggal terkecil yang >= hari ini (menghindari historis).
     */
    private function guessReferenceDate(array $etdRow, array $timeChartRow): ?Carbon
    {
        $today  = Carbon::today();
        $future = [];
        $all    = [];

        foreach ($etdRow as $val) {
            $date = $this->parseDateValue($val);
            if ($date === null) {
                continue;
            }
            $all[] = $date;
            if ($date->gte($today)) {
                $future[] = $date;
            }
        }

        if (!empty($future)) {
            usort($future, fn($a, $b) => $a->timestamp <=> $b->timestamp);
            return $future[0];
        }

        if (!empty($all)) {
            usort($all, fn($a, $b) => $a->timestamp <=> $b->timestamp);
            return $all[0];
        }

        // Fallback dari TIME CHART
        foreach ($timeChartRow as $val) {
            if ($val !== null && is_numeric($val) && (int) $val >= 1 && (int) $val <= 12) {
                return Carbon::create(Carbon::now()->year, (int) $val, 1);
            }
        }

        return null;
    }

    /**
     * Resolve base year dari anchor bulan TIME CHART pertama dan ETD dates.
     *
     * Strategi: periksa nilai ETD di kolom anchor (col $anchorCol).
     * Jika ETD memiliki info tahun eksplisit (DateTime object), gunakan tahunnya.
     * Jika tidak, gunakan tahun dari tanggal terkecil di ETD row.
     */
    private function resolveBaseYear(int $anchorMonth, array $etdRow, int $anchorCol): int
    {
        // Coba dari ETD di kolom anchor
        $etdAtAnchor = $this->parseDateValue($etdRow[$anchorCol] ?? null);
        if ($etdAtAnchor !== null) {
            return $etdAtAnchor->year;
        }

        // Coba dari ETD row — ambil tahun paling sering muncul
        $years = [];
        foreach ($etdRow as $val) {
            $date = $this->parseDateValue($val);
            if ($date !== null) {
                $years[$date->year] = ($years[$date->year] ?? 0) + 1;
            }
        }

        if (!empty($years)) {
            arsort($years);
            return array_key_first($years);
        }

        return Carbon::now()->year;
    }

    /**
     * Normalisasi tahun pada Carbon date.
     * PhpSpreadsheet sudah parse tanggal dengan benar untuk DateTime objects.
     * Method ini hanya dipanggil untuk fallback string parsing.
     */
    private function normalizeYear(Carbon $date, int $expectedYear): Carbon
    {
        // Jika tahun sudah benar (dari DateTime object), tidak perlu koreksi
        if (abs($date->year - $expectedYear) <= 1) {
            return $date;
        }
        // Koreksi tahun jika terpaut jauh (edge case string parsing)
        try {
            return $date->copy()->year($expectedYear);
        } catch (\Throwable $e) {
            return $date;
        }
    }

    /**
     * Parse nilai sel menjadi Carbon date.
     */
    private function parseDateValue(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        // PhpSpreadsheet DateTime object (paling umum untuk file XLSM)
        if ($value instanceof \DateTime || $value instanceof \DateTimeImmutable) {
            return Carbon::instance($value)->startOfDay();
        }

        // Excel serial number
        if (is_float($value) || (is_int($value) && $value > 40000)) {
            try {
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value);
                return Carbon::instance($dt)->startOfDay();
            } catch (\Throwable $e) {
                Log::warning("YCMapper: gagal parse serial: {$value}");
            }
        }

        if (is_string($value)) {
            return $this->parseDateString($value);
        }

        return null;
    }

    private function parseDateString(string $str): ?Carbon
    {
        $str = trim($str);
        if ($str === '' || str_starts_with($str, '=')) {
            return null;
        }

        // YYYY-MM-DD
        if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/', $str, $m)) {
            if (checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                return Carbon::create((int) $m[1], (int) $m[2], (int) $m[3])->startOfDay();
            }
        }

        // DD/MM/YYYY
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $str, $m)) {
            $a = (int) $m[1];
            $b = (int) $m[2];
            $y = (int) $m[3];
            if ($a > 12 && checkdate($b, $a, $y)) {
                return Carbon::create($y, $b, $a)->startOfDay();
            }
            if ($b > 12 && checkdate($a, $b, $y)) {
                return Carbon::create($y, $a, $b)->startOfDay();
            }
            if (checkdate($b, $a, $y)) {
                return Carbon::create($y, $b, $a)->startOfDay();
            }
        }

        try {
            return Carbon::parse($str)->startOfDay();
        } catch (\Throwable $e) {
            return null;
        }
    }
}