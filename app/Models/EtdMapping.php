<?php
// app/Models/EtdMapping.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class EtdMapping extends Model
{
    protected $table = 'etd_mappings';
    
    protected $fillable = [
        'customer_id', 'etd_date', 'production_week_id', 
        'is_edited', 'edited_by', 'edited_at'
    ];
    
    protected $casts = [
        'etd_date' => 'date',
        'is_edited' => 'boolean',
        'edited_at' => 'datetime',
    ];
    
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
    
    public function productionWeek()
    {
        return $this->belongsTo(ProductionWeek::class);
    }
    
    public function editor()
    {
        return $this->belongsTo(User::class, 'edited_by');
    }
    
    /**
     * Cari mapping untuk ETD tertentu
     */
    public static function findByEtd($customerId, $etdDate)
    {
        return self::where('customer_id', $customerId)
            ->where('etd_date', $etdDate)
            ->first();
    }
    
    /**
     * Simpan atau update mapping
     */
    public static function saveMapping($customerId, $etdDate, $weekId, $isEdited = false, $userId = null)
    {
        return self::updateOrCreate(
            [
                'customer_id' => $customerId,
                'etd_date' => $etdDate,
            ],
            [
                'production_week_id' => $weekId,
                'is_edited' => $isEdited,
                'edited_by' => $userId,
                'edited_at' => $isEdited ? now() : null,
            ]
        );
    }
}