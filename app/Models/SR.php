<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SR extends Model
{
    protected $table = 'srs';

    protected $fillable = [
        'customer',
        'source_file',
        'upload_batch',
        'sheet_index',
        'sheet_name',
        'part_number',
        'assy_no',
        'qty',
        'total',
        'delivery_date',
        'etd',
        'eta',
        'week',
        'month',
        'order_type',
        'route',
        'port',
        'model',
        'family',
        'extra',
    ];

    protected $casts = [
        'extra' => 'array',
    ];

    public function getSummaryData()
    {
        return self::where('source_file', $this->source_file)
            ->orderBy('delivery_date')
            ->get();
    }
}
