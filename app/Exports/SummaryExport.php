<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SummaryExport implements FromArray, WithHeadings, WithStyles
{
    protected $data;
    
    public function __construct($data)
    {
        $this->data = $data;
    }
    
    public function array(): array
    {
        $exportData = [];
        foreach ($this->data as $index => $item) {
            $exportData[] = [
                $index + 1,
                $item->part_number,
                $item->order_type,
                $item->etd,
                $item->eta,
                $item->qty,
            ];
        }
        return $exportData;
    }
    
    public function headings(): array
    {
        return [
            'No',
            'Part Number',
            'Order Type',
            'ETD',
            'ETA',
            'QTY'
        ];
    }
    
    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}