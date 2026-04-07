<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class SummaryExport implements FromArray, WithStyles, WithColumnWidths, WithCustomStartCell
{
    protected $data;

    // ── Colors ────────────────────────────────────────────────────────────
    const COLOR_GREEN_DARK   = 'FF375623';
    const COLOR_GREEN_LIGHT  = 'FFE2EFDA';
    const COLOR_GREEN_MID    = 'FFC6EFCE';

    const COLOR_FIRM_HEADER  = 'FFFFFF00';
    const COLOR_FIRM_SUB     = 'FFFFFF00';
    const COLOR_FIRM_4W_HDR  = 'FFBFBFBF';
    const COLOR_FIRM_4W_DATA = 'FFD9D9D9';

    const COLOR_FORE_HEADER  = 'FFF4B183';
    const COLOR_FORE_SUB     = 'FFFCE4D6';

    public function __construct($data)
    {
        $this->data = $data;
    }

    // ── 1. Array ──────────────────────────────────────────────────────────
    public function array(): array
    {
        [, $groups] = $this->buildPeriods();
        $rows = [];

        // Row 1 — group labels
        $row1 = ['NO', 'ASSY NO', 'Order Type'];
        foreach ($groups as $group) {
            foreach ($group['periods'] as $i => $p) {
                $row1[] = $i === 0 ? $group['type'] : '';
            }
        }
        $rows[] = $row1;

        // Row 2 — ETD
        $row2 = ['', '', 'ETD'];
        foreach ($groups as $group) {
            foreach ($group['periods'] as $p) {
                $row2[] = $p['etd'];
            }
        }
        $rows[] = $row2;

        // Row 3 — ETA
        $row3 = ['', '', 'ETA'];
        foreach ($groups as $group) {
            foreach ($group['periods'] as $p) {
                $row3[] = $p['eta'];
            }
        }
        $rows[] = $row3;

        // Row 4 — week
        $row4 = ['', '', 'week'];
        foreach ($groups as $group) {
            foreach ($group['periods'] as $p) {
                $row4[] = $p['week'];
            }
        }
        $rows[] = $row4;

        // Data rows — satu baris per part_number
        $grouped = $this->data->groupBy('part_number');
        $index   = 0;

        foreach ($grouped as $partNumber => $items) {
            $index++;

            // Lookup: "orderType|etd_raw|eta_raw|week" => qty (sum jika duplikat)
            $lookup = [];
            foreach ($items as $item) {
                $key = implode('|', [$item->order_type, $item->etd, $item->eta, $item->week]);
                $lookup[$key] = ($lookup[$key] ?? 0) + ((int)($item->qty ?? 0));
            }

            $dataRow = [$index, $partNumber, 'QTY'];
            foreach ($groups as $group) {
                foreach ($group['periods'] as $p) {
                    $key       = implode('|', [$group['type'], $p['etd_raw'], $p['eta_raw'], $p['week']]);
                    $dataRow[] = $lookup[$key] ?? 0;
                }
            }
            $rows[] = $dataRow;
        }

        return $rows;
    }

    // ── 2. Column widths ──────────────────────────────────────────────────
    public function columnWidths(): array
    {
        $widths = ['A' => 5, 'B' => 14, 'C' => 10];
        [, $groups] = $this->buildPeriods();
        $total = array_sum(array_map(fn($g) => count($g['periods']), $groups));
        for ($i = 0; $i < $total; $i++) {
            $widths[Coordinate::stringFromColumnIndex($i + 4)] = 6.5;
        }
        return $widths;
    }

    // ── 3. Start cell ─────────────────────────────────────────────────────
    public function startCell(): string { return 'A1'; }

    // ── 4. Styles ─────────────────────────────────────────────────────────
    public function styles(Worksheet $sheet)
    {
        [, $groups] = $this->buildPeriods();
        $totalDataCols = array_sum(array_map(fn($g) => count($g['periods']), $groups));
        $lastCol       = Coordinate::stringFromColumnIndex(3 + $totalDataCols);
        $totalRows     = $sheet->getHighestRow();

        // Row heights
        for ($r = 1; $r <= 4; $r++) $sheet->getRowDimension($r)->setRowHeight(16);
        for ($r = 5; $r <= $totalRows; $r++) $sheet->getRowDimension($r)->setRowHeight(15);

        // Freeze
        $sheet->freezePane('D5');

        // Merge: NO, ASSY No (rows 1-4)
        $sheet->mergeCells('A1:A4');
        $sheet->mergeCells('B1:B4');

        // Merge: group headers (row 1)
        $colOffset = 4;
        foreach ($groups as $group) {
            $count = count($group['periods']);
            if ($count > 1) {
                $cs = Coordinate::stringFromColumnIndex($colOffset);
                $ce = Coordinate::stringFromColumnIndex($colOffset + $count - 1);
                $sheet->mergeCells("{$cs}1:{$ce}1");
            }
            $colOffset += $count;
        }

        // Base border
        $sheet->getStyle("A1:{$lastCol}{$totalRows}")->applyFromArray([
            'borders' => ['allBorders' => [
                'borderStyle' => Border::BORDER_THIN,
                'color'       => ['argb' => 'FFAAAAAA'],
            ]],
        ]);

        // Fixed left cols header (dark green)
        foreach (['A', 'B', 'C'] as $col) {
            $sheet->getStyle("{$col}1:{$col}4")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::COLOR_GREEN_DARK]],
                'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'name' => 'Arial', 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                                'vertical'   => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);
        }

        // Group header colors
        $colOffset = 4;
        foreach ($groups as $group) {
            $count       = count($group['periods']);
            $isFirm      = $group['type'] === 'FIRM';
            $headerColor = $isFirm ? self::COLOR_FIRM_HEADER : self::COLOR_FORE_HEADER;
            $subColor    = $isFirm ? self::COLOR_FIRM_SUB    : self::COLOR_FORE_SUB;
            $cs          = Coordinate::stringFromColumnIndex($colOffset);
            $ce          = Coordinate::stringFromColumnIndex($colOffset + $count - 1);

            $sheet->getStyle("{$cs}1:{$ce}1")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $headerColor]],
                'font'      => ['bold' => true, 'color' => ['argb' => 'FF000000'], 'name' => 'Arial', 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                                'vertical'   => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getStyle("{$cs}2:{$ce}4")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $subColor]],
                'font'      => ['bold' => true, 'color' => ['argb' => 'FF000000'], 'name' => 'Arial', 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                                'vertical'   => Alignment::VERTICAL_CENTER],
            ]);

            // Grey 4W columns inside FIRM
            if ($isFirm) {
                $pIdx = 0;
                foreach ($group['periods'] as $p) {
                    if (strtoupper($p['week']) === '4W') {
                        $gc = Coordinate::stringFromColumnIndex($colOffset + $pIdx);
                        // Rows 2-4 header grey (override kuning)
                        $sheet->getStyle("{$gc}2:{$gc}4")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID,
                                       'startColor' => ['argb' => self::COLOR_FIRM_4W_HDR]],
                        ]);
                        // Data rows grey
                        $sheet->getStyle("{$gc}5:{$gc}{$totalRows}")->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID,
                                       'startColor' => ['argb' => self::COLOR_FIRM_4W_DATA]],
                        ]);
                    }
                    $pIdx++;
                }
            }

            $colOffset += $count;
        }

        // Fixed left cols data (dark green)
        $sheet->getStyle("A5:C{$totalRows}")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::COLOR_GREEN_DARK]],
            'font'      => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF'], 'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getStyle("B5:B{$totalRows}")->getAlignment()
              ->setHorizontal(Alignment::HORIZONTAL_LEFT);

        // Alternating data rows
        for ($r = 5; $r <= $totalRows; $r++) {
            $color = ($r % 2 === 1) ? self::COLOR_GREEN_LIGHT : self::COLOR_GREEN_MID;
            $sheet->getStyle("D{$r}:{$lastCol}{$r}")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $color]],
                'font'      => ['name' => 'Arial', 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT,
                                'vertical'   => Alignment::VERTICAL_CENTER],
            ]);
        }

        return [];
    }

    // ── Helper: buildPeriods ──────────────────────────────────────────────
    protected function buildPeriods(): array
    {
        // ✅ Filter FIRM: hanya bulan yang sedang berjalan
        $currentMonth = (int) date('n');
        $currentYear  = (int) date('Y');

        $firmPeriods     = [];
        $forecastPeriods = [];

        foreach ($this->data as $item) {
            $key = implode('|', [$item->etd, $item->eta, $item->week]);

            $entry = [
                'etd'     => date('n/j', strtotime($item->etd)),
                'eta'     => date('n/j', strtotime($item->eta)),
                'week'    => $item->week,
                'etd_raw' => $item->etd,
                'eta_raw' => $item->eta,
                'month'   => $item->month ?? date('Y-m', strtotime($item->eta)),
            ];

            if ($item->order_type === 'FIRM') {
                // ✅ Hanya masukkan jika ETD ada di bulan berjalan
                $etdMonth = (int) date('n', strtotime($item->etd));
                $etdYear  = (int) date('Y', strtotime($item->etd));

                if ($etdMonth === $currentMonth && $etdYear === $currentYear) {
                    $firmPeriods[$key] ??= $entry;
                }
            } else {
                $forecastPeriods[$key] ??= $entry;
            }
        }

        // Sort by ETD
        uasort($firmPeriods,     fn($a, $b) => strcmp($a['etd_raw'], $b['etd_raw']));
        uasort($forecastPeriods, fn($a, $b) => strcmp($a['etd_raw'], $b['etd_raw']));

        // Split FORECAST per bulan
        $forecastGroups = $this->splitForecastByMonth($forecastPeriods);

        $groups = [];
        if (!empty($firmPeriods)) {
            $groups[] = ['type' => 'FIRM', 'periods' => array_values($firmPeriods)];
        }
        foreach ($forecastGroups as $chunk) {
            $groups[] = ['type' => 'FORECAST', 'periods' => $chunk];
        }

        $allPeriods = array_merge(array_values($firmPeriods), array_values($forecastPeriods));
        return [$allPeriods, $groups];
    }

    /**
     * Split FORECAST periods menjadi kelompok per bulan.
     *
     * - Format "1W","2W",... (TYC) → split saat weekNum == 1
     * - Format angka murni "08","09",... (YNA) → split berdasarkan field 'month'
     */
    private function splitForecastByMonth(array $forecastPeriods): array
    {
        if (empty($forecastPeriods)) return [];

        $firstWeek  = array_values($forecastPeriods)[0]['week'] ?? '';
        $isNwFormat = (bool) preg_match('/^\d+W$/i', trim($firstWeek));

        $groups       = [];
        $currentChunk = [];
        $currentMonth = null;

        foreach ($forecastPeriods as $p) {
            if ($isNwFormat) {
                $weekNum = (int) preg_replace('/\D/', '', $p['week']);
                if ($weekNum === 1 && !empty($currentChunk)) {
                    $groups[]     = $currentChunk;
                    $currentChunk = [];
                }
            } else {
                $month = $p['month'];
                if ($currentMonth !== null && $month !== $currentMonth && !empty($currentChunk)) {
                    $groups[]     = $currentChunk;
                    $currentChunk = [];
                }
                $currentMonth = $month;
            }

            $currentChunk[] = $p;
        }

        if (!empty($currentChunk)) {
            $groups[] = $currentChunk;
        }

        return $groups;
    }
}