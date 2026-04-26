<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ProductionWeek extends Model
{
    protected $table = 'production_weeks';

    protected $fillable = [
        'customer_id',
        'year',
        'month_number',
        'month_name',
        'week_no',
        'week_start',
        'num_weeks',
    ];

    protected $casts = [
        'week_start' => 'date',
    ];

    // ─── Relasi ───────────────────────────────────────────────
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function sppRecords()
    {
        // FIX: nama class harus Spp bukan SPP (PSR-4)
        return $this->hasMany(Spp::class, 'week_id');
    }

    public function etdMappings()
    {
        return $this->hasMany(EtdMapping::class);
    }

    // ─── Helper ───────────────────────────────────────────────
    /**
     * Cek apakah tanggal ETD masuk ke week ini.
     * Patokan: ETD >= week_start minggu ini DAN < week_start minggu berikutnya
     */
    public function containsDate($date)
    {
        $nextWeek = ProductionWeek::where('customer_id', $this->customer_id)
            ->where('year', $this->year)
            ->where('week_start', '>', $this->week_start)
            ->orderBy('week_start')
            ->first();

        $endDate = $nextWeek
            ? $nextWeek->week_start
            : $this->week_start->copy()->addDays(7);

        return $date >= $this->week_start && $date < $endDate;
    }

    /**
     * Scope filter by customer
     */
    public function scopeForCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    /**
     * Scope filter by year
     */
    public function scopeForYear($query, $year)
    {
        return $query->where('year', $year);
    }

    /**
     * Find the production week that contains the given ETD date.
     * The week is determined by the latest week_start less than or equal to the date.
     */
    public static function findByDate(int $customerId, $date): ?self
    {
        if (empty($date)) {
            return null;
        }

        $date = Carbon::parse($date)->startOfDay();

        return self::where('customer_id', $customerId)
            ->where('week_start', '<=', $date)
            ->orderBy('week_start', 'desc')
            ->first();
    }
}
