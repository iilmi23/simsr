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
use Carbon\Carbon;

class YNAExport implements FromArray, WithStyles, WithColumnWidths, WithCustomStartCell
{
    protected $data;

    // ── Color Palette — "Forest Green" ───────────────────────────────────
    // Header
    const COLOR_HEADER_FIXED    = 'FF1D4D2A'; // dark forest       → col A-C header
    const COLOR_HEADER_ETD      = 'FF1D6F42'; // forest green      → ETD row header
    const COLOR_HEADER_ETA      = 'FF2E9E5E'; // medium green      → ETA row header

    // Left label columns (data area)
    const COLOR_LEFT_BG         = 'FF2D5A3D'; // slate green       → col A-C data
    const COLOR_LEFT_QTY_BG     = 'FF3A6B4E'; // muted green       → "QTY" cell

    // Data rows
    const COLOR_ROW_ODD         = 'FFEAF5EF'; // soft mint         → odd rows
    const COLOR_ROW_EVEN        = 'FFC6E8D4'; // powder green      → even rows

    // Text
    const COLOR_TEXT_WHITE      = 'FFFFFFFF';
    const COLOR_TEXT_MUTED      = 'FFAABFB0'; // [REVISED] soft green-grey for zeros (was blue-grey)
    const COLOR_TEXT_VALUE      = 'FF0D4F2C'; // [REVISED] deep green for non-zero (was green-700)
    const COLOR_TEXT_QTY_LABEL  = 'FFD4EDE0'; // [REVISED] brighter QTY label contrast

    // Borders
    const COLOR_BORDER_LIGHT    = 'FF8FC9A8'; // [REVISED] slightly darker green-200 for visibility
    const COLOR_BORDER_HEADER   = 'FF145233'; // green-800

    // TOTAL Row
    // [REVISED] deep forest green — on-theme instead of blue-800
    const COLOR_TOTAL_BG        = 'FF0F3320';
    const COLOR_TOTAL_BORDER    = 'FF2E7D52';
    const COLOR_TOTAL_TOP       = 'FF4CAF78';

    public function __construct($data)
    {
        $this->data = $data;
    }

    // ── 1. Array ──────────────────────────────────────────────────────────
    public function array(): array
    {
        $rows    = [];
        $periods = $this->buildPeriods();

        // Row 1 — ETD labels
        $row1 = ['NO', 'ASSY NO', 'ETD'];
        foreach ($periods as $p) {
            $row1[] = $p['etd'];
        }
        $rows[] = $row1;

        // Row 2 — ETA labels
        $row2 = ['', '', 'ETA'];
        foreach ($periods as $p) {
            $row2[] = $p['eta'];
        }
        $rows[] = $row2;

        // Row 3 — Week numbers (with color coding by week)
        $row3 = ['', '', 'WEEK'];
        foreach ($periods as $p) {
            $row3[] = 'W' . $p['week'];
        }
        $rows[] = $row3;

        // Data rows — satu baris per part_number
        $grouped = $this->data->groupBy('part_number');
        $index   = 0;

        foreach ($grouped as $partNumber => $items) {
            $index++;

            // Use assy_no if available (from first item), otherwise use part_number
            $firstItem = $items->first();
            $assyNo = ($firstItem->assy_no && $firstItem->assy_no !== '') ? $firstItem->assy_no : $partNumber;

            $lookup = [];
            foreach ($items as $item) {
                $key = implode('|', [$item->etd, $item->eta]);
                $lookup[$key] = ($lookup[$key] ?? 0) + ((int)($item->qty ?? 0));
            }

            $dataRow = [$index, $assyNo, 'QTY'];
            foreach ($periods as $p) {
                $key        = implode('|', [$p['etd_raw'], $p['eta_raw']]);
                $cellValue  = $lookup[$key] ?? 0;
                $dataRow[]  = ($cellValue === 0) ? '0' : $cellValue;
            }
            $rows[] = $dataRow;
        }

        // Row total
        $totalRow = ['', 'TOTAL', ''];
        foreach ($periods as $p) {
            $key   = implode('|', [$p['etd_raw'], $p['eta_raw']]);
            $total = 0;
            foreach ($this->data->groupBy('part_number') as $items) {
                foreach ($items as $item) {
                    if (implode('|', [$item->etd, $item->eta]) === $key) {
                        $total += (int)($item->qty ?? 0);
                    }
                }
            }
            $totalRow[] = ($total === 0) ? '0' : $total;
        }
        $rows[] = $totalRow;

        return $rows;
    }

    // ── 2. Column widths ──────────────────────────────────────────────────
    public function columnWidths(): array
    {
        $widths  = ['A' => 5, 'B' => 16, 'C' => 9];
        $periods = $this->buildPeriods();

        for ($i = 0; $i < count($periods); $i++) {
            $widths[Coordinate::stringFromColumnIndex($i + 4)] = 7;
        }
        return $widths;
    }

    // ── 3. Start cell ─────────────────────────────────────────────────────
    public function startCell(): string
    {
        return 'A1';
    }

    // ── 4. Styles ─────────────────────────────────────────────────────────
    public function styles(Worksheet $sheet)
    {
        $periods       = $this->buildPeriods();
        $totalDataCols = count($periods);
        $lastColIdx    = 3 + $totalDataCols;
        $lastCol       = Coordinate::stringFromColumnIndex($lastColIdx);
        $totalRows     = $sheet->getHighestRow();
        $dataFirstRow  = 4;
        $dataLastRow   = $totalRows - 1;

        // ── Row heights ───────────────────────────────────────────────────
        $sheet->getRowDimension(1)->setRowHeight(18);
        $sheet->getRowDimension(2)->setRowHeight(18);
        $sheet->getRowDimension(3)->setRowHeight(18);
        for ($r = 4; $r <= $totalRows; $r++) {
            $sheet->getRowDimension($r)->setRowHeight(15);
        }

        // ── Freeze panes (include week row) ───────────────────────────────
        $sheet->freezePane('D4');

        // ── Merge: NO, ASSY NO (span 3 header rows) ───────────────────────
        $sheet->mergeCells('A1:A3');
        $sheet->mergeCells('B1:B3');

        // ════════════════════════════════════════════════════════════════
        // HEADER — fixed cols (A-C)
        // ════════════════════════════════════════════════════════════════
        $sheet->getStyle("A1:C3")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_HEADER_FIXED]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER, 'wrapText' => false],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                             'color'       => ['argb' => self::COLOR_BORDER_HEADER]]],
        ]);

        // ════════════════════════════════════════════════════════════════
        // HEADER — period cols
        // ════════════════════════════════════════════════════════════════
        $startPeriodCol = Coordinate::stringFromColumnIndex(4);
        $endPeriodCol   = $lastCol;

        // ETD row (row 1)
        // [REVISED] Added bottom MEDIUM border to visually separate from ETA row
        $sheet->getStyle("{$startPeriodCol}1:{$endPeriodCol}1")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_HEADER_ETD]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                 'color'       => ['argb' => self::COLOR_BORDER_HEADER]],
                'bottom'     => ['borderStyle' => Border::BORDER_MEDIUM,
                                 'color'       => ['argb' => self::COLOR_BORDER_HEADER]],
            ],
        ]);

        // ETA row (row 2)
        $sheet->getStyle("{$startPeriodCol}2:{$endPeriodCol}2")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_HEADER_ETA]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                             'color'       => ['argb' => self::COLOR_BORDER_HEADER]]],
        ]);

        // WEEK row (row 3) — medium blue background with strong text
        $sheet->getStyle("{$startPeriodCol}3:{$endPeriodCol}3")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => 'FF4A90E2']],  // Medium blue for week row
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                 'color'       => ['argb' => self::COLOR_BORDER_HEADER]],
                'bottom'     => ['borderStyle' => Border::BORDER_MEDIUM,
                                 'color'       => ['argb' => self::COLOR_BORDER_HEADER]],
            ],
        ]);

        // ════════════════════════════════════════════════════════════════
        // DATA ROWS — left fixed cols (A-C)
        // ════════════════════════════════════════════════════════════════
        $sheet->getStyle("A{$dataFirstRow}:C{$dataLastRow}")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_LEFT_BG]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                             'color'       => ['argb' => 'FF334155']]],
        ]);

        // Col B (ASSY NO) — left-align with indent
        $sheet->getStyle("B{$dataFirstRow}:B{$dataLastRow}")->getAlignment()
              ->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle("B{$dataFirstRow}:B{$dataLastRow}")->getAlignment()->setIndent(1);

        // Col C (QTY label) — [REVISED] brighter text for readability
        $sheet->getStyle("C{$dataFirstRow}:C{$dataLastRow}")->applyFromArray([
            'fill' => ['fillType'   => Fill::FILL_SOLID,
                       'startColor' => ['argb' => self::COLOR_LEFT_QTY_BG]],
            'font' => ['bold'  => false, 'color' => ['argb' => self::COLOR_TEXT_QTY_LABEL],
                       'name'  => 'Arial', 'size' => 8],
        ]);

        // ════════════════════════════════════════════════════════════════
        // DATA ROWS — alternating bg, period columns
        // [REVISED] BORDER_THIN (was HAIR) — grid visible on zoom out / print
        // ════════════════════════════════════════════════════════════════
        for ($r = $dataFirstRow; $r <= $dataLastRow; $r++) {
            $bgColor = ($r % 2 === 0) ? self::COLOR_ROW_ODD : self::COLOR_ROW_EVEN;

            $sheet->getStyle("{$startPeriodCol}{$r}:{$endPeriodCol}{$r}")->applyFromArray([
                'fill'      => ['fillType'   => Fill::FILL_SOLID,
                                'startColor' => ['argb' => $bgColor]],
                'font'      => ['name' => 'Arial', 'size' => 9, 'bold' => false],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT,
                                'vertical'   => Alignment::VERTICAL_CENTER],
                'numberFormat' => ['formatCode' => '0'],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                                 'color'       => ['argb' => self::COLOR_BORDER_LIGHT]]],
            ]);
        }

        // ════════════════════════════════════════════════════════════════
        // Zero / non-zero value coloring
        // ════════════════════════════════════════════════════════════════
        for ($r = $dataFirstRow; $r <= $dataLastRow; $r++) {
            for ($c = 4; $c <= $lastColIdx; $c++) {
                $cellCoord = Coordinate::stringFromColumnIndex($c) . $r;
                $cellVal   = $sheet->getCell($cellCoord)->getValue();
                if ($cellVal === 0 || $cellVal === '0') {
                    $sheet->getStyle($cellCoord)->getFont()
                          ->getColor()->setARGB(self::COLOR_TEXT_MUTED);
                } else {
                    $sheet->getStyle($cellCoord)->getFont()
                          ->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color(self::COLOR_TEXT_VALUE));
                    $sheet->getStyle($cellCoord)->getFont()->setBold(true);
                }
            }
        }

        // ════════════════════════════════════════════════════════════════
        // TOTAL ROW — [REVISED] deep forest green, on-theme
        // ════════════════════════════════════════════════════════════════
        $sheet->getStyle("A{$totalRows}:{$lastCol}{$totalRows}")->applyFromArray([
            'fill'      => ['fillType'   => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_TOTAL_BG]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'numberFormat' => ['formatCode' => '0'],
            'borders'   => [
                'top'        => ['borderStyle' => Border::BORDER_MEDIUM,
                                 'color'       => ['argb' => self::COLOR_TOTAL_TOP]],
                'bottom'     => ['borderStyle' => Border::BORDER_MEDIUM,
                                 'color'       => ['argb' => self::COLOR_TOTAL_BG]],
                'allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                 'color'       => ['argb' => self::COLOR_TOTAL_BORDER]],
            ],
        ]);

        // "TOTAL" label di col B — align left
        $sheet->getStyle("B{$totalRows}")->getAlignment()
              ->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle("B{$totalRows}")->getAlignment()->setIndent(1);

        // Outer border seluruh tabel
        $sheet->getStyle("A1:{$lastCol}{$totalRows}")->applyFromArray([
            'borders' => ['outline' => ['borderStyle' => Border::BORDER_MEDIUM,
                                        'color'       => ['argb' => 'FF1E2A3A']]],
        ]);

        return [];
    }

    // ── Helper: buildPeriods ──────────────────────────────────────────────
    protected function buildPeriods(): array
    {
        $periods = [];

        foreach ($this->data as $item) {
            $key = implode('|', [$item->etd, $item->eta]);
            $weekInfo = $this->getYNAWeekInfo(strtotime($item->etd));

            $periods[$key] ??= [
                'etd'        => date('n/j', strtotime($item->etd)),
                'eta'        => date('n/j', strtotime($item->eta)),
                'etd_raw'    => $item->etd,
                'eta_raw'    => $item->eta,
                'week'       => $weekInfo['week'],
                'week_month' => $weekInfo['month_year'],
            ];
        }

        uasort($periods, function ($a, $b) {
            if ($a['week_month'] !== $b['week_month']) {
                return strcmp($a['week_month'], $b['week_month']);
            }
            if ($a['week'] !== $b['week']) {
                return $a['week'] <=> $b['week'];
            }
            return strcmp($a['etd_raw'], $b['etd_raw']);
        });

        return array_values($periods);
    }

    /**
     * Calculate YNA week number for a given date.
     *
     * YNA orders run weekly Monday-Friday (or Thursday-Friday).
     * Week 1 of a month is the week containing the 1st of the month,
     * starting from the Monday closest to that date (before or after).
     *
     * Algorithm:
     * 1. For the month of the date, find the Monday closest to the 1st of that month
     * 2. That Monday becomes the start of Week 1 for that month
     * 3. Count weeks from that Monday
     *
     * Examples:
     * - April 1 is Wednesday → Monday before (March 30) = Week 1 start for April
     * - Feb 1 is Sunday → Monday after (Feb 2) = Week 1 start for Feb
     *
     * @param int|string $timestamp
     * @return int Week number (1-5)
     */
    private function calculateYNAWeek($timestamp): int
    {
        return $this->getYNAWeekInfo($timestamp)['week'];
    }

    private function getYNAWeekInfo($timestamp): array
    {
        $date = new Carbon('@' . (int)$timestamp);

        $weekMonday = $date->copy()->startOfWeek(Carbon::MONDAY);
        $remainingDaysInMonth = $weekMonday->daysInMonth - $weekMonday->day + 1;
        $weekMonthDate = $weekMonday->copy();

        if ($remainingDaysInMonth <= 2) {
            $weekMonthDate->addMonthNoOverflow();
        }

        $targetYear = $weekMonthDate->year;
        $targetMonth = $weekMonthDate->month;

        $firstOfMonth = Carbon::create($targetYear, $targetMonth, 1);
        $firstMonday = $firstOfMonth->copy()->startOfWeek(Carbon::MONDAY);

        if ($firstMonday->month !== $targetMonth) {
            $prevMonthRemaining = $firstMonday->daysInMonth - $firstMonday->day + 1;
            if ($prevMonthRemaining > 2) {
                $firstMonday->addWeek();
            }
        }

        $daysFromFirstMonday = $firstMonday->diffInDays($weekMonday, false);
        $weekNumber = intdiv($daysFromFirstMonday, 7) + 1;

        return [
            'week'       => min($weekNumber, 5),
            'month_year' => $weekMonthDate->format('Y-m'),
        ];
    }
}