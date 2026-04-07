<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SPP extends Model
{
    protected $table = 'spp_records';

    protected $fillable = [
        'customer',
        'part_number',
        'model',
        'family',
        'month',
        'week_label',
        'delivery_date',
        'eta',
        'etd',
        'qty',
        'order_type',
        'port',
    ];
}
