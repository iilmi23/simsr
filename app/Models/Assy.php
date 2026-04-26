<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Assy extends Model
{
    protected $table = 'assy';

    protected $fillable = [
        'carline_id',
        'part_number',
        'assy_code',
        'level',
        'type',
        'umh',
        'std_pack',
        'is_active',
    ];

    protected $casts = [
        'umh' => 'decimal:6',
        'is_active' => 'boolean',
    ];

    // Relasi
    public function carline()
    {
        return $this->belongsTo(Carline::class, 'carline_id', 'id');
    }

    public function spp()
    {
        return $this->hasMany(SPP::class);
    }


    // Helper: full identifier
    public function getFullNameAttribute()
    {
        return $this->part_number . ' - ' . $this->assy_code;
    }
}