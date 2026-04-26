<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SR extends Model
{
    protected $table = 'srs';

    protected $fillable = [
        'customer',
        'carline_id',
        'assy_id',
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
        'year',
        'order_type',
        'route',
        'port',
        'model',
        'family',
        'is_mapped',
        'mapping_error',
        'extra',
    ];

    protected $casts = [
        'extra' => 'array',
    ];

    // Relasi
    public function carline()
    {
        return $this->belongsTo(CarLine::class, 'carline_id', 'id');
    }

    public function assy()
    {
        return $this->belongsTo(Assy::class, 'assy_id', 'id');
    }

    public function getSummaryData()
    {
        return self::where('source_file', $this->source_file)
            ->orderBy('delivery_date')
            ->get();
    }
}
