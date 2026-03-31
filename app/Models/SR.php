<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SR extends Model
{
    protected $table = 'srs';

    protected $fillable = [
        'customer',
        'sr_number',
        'source_file',
        'part_number',
        'qty',
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
        return self::where('sr_number', $this->sr_number)
            ->orderBy('delivery_date')
            ->get();
    }
}
