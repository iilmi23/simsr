<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use Carbon\Carbon;

class SummaryListExport implements FromArray, WithHeadings, WithStyles
{
    protected $data;

    public function __construct($data)
    {
        $this->data = $data;
    }

    public function array(): array
    {
        return $this->data->map(function ($item, $index) {
            $uploadDate = $item->upload_date;
            if (!($uploadDate instanceof Carbon)) {
                $uploadDate = Carbon::parse($uploadDate);
            }

            return [
                $index + 1,
                $item->source_file,
                $item->customer,
                $item->port,
                $item->total_items,
                $item->total_qty,
                $uploadDate->format('Y-m-d H:i:s'),
            ];
        })->toArray();
    }

    public function headings(): array
    {
        return [
            'No',
            'Source File',
            'Customer',
            'Port',
            'Total Items',
            'Total Qty',
            'Upload Date',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
