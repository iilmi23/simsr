<?php

namespace App\Services;

use App\Models\ProductionWeek;
use App\Models\EtdMapping;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class WeekGenerator
{
    /**
     * Auto-generate production weeks dari range tanggal ETD
     * 
     * @param int $customerId
     * @param string $startDate (Y-m-d)
     * @param string $endDate (Y-m-d)
     * @return Collection
     */
    public static function generateFromDateRange($customerId, $startDate, $endDate)
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        
        // Mulai dari hari Senin pertama sebelum atau sama dengan start date
        $current = $start->copy();
        while ($current->dayOfWeek != Carbon::MONDAY) {
            $current->subDay();
        }
        
        $savedWeeks = [];
        $weekNo = 1;
        
        while ($current <= $end) {
            $year = $current->year;
            $month = $current->month;
            $monthName = strtoupper($current->shortMonthName);
            
            // Hitung total minggu di bulan ini
            $temp = $current->copy();
            $numWeeks = 0;
            $currentMonth = $month;
            while ($temp->month == $currentMonth && $temp <= $end) {
                $numWeeks++;
                $temp->addWeek();
            }
            
            // Simpan atau update week
            $week = ProductionWeek::updateOrCreate(
                [
                    'customer_id' => $customerId,
                    'year' => $year,
                    'month_number' => $month,
                    'week_no' => $weekNo,
                ],
                [
                    'month_name' => $monthName,
                    'week_start' => $current->toDateString(),
                    'num_weeks' => $numWeeks,
                ]
            );
            
            $savedWeeks[] = $week;
            
            $current->addWeek();
            $weekNo++;
        }
        
        return collect($savedWeeks);
    }
    
    /**
     * Cari week berdasarkan tanggal ETD
     * 
     * @param int $customerId
     * @param string $date (Y-m-d)
     * @return ProductionWeek|null
     */
    public static function findWeekByDate($customerId, $date)
    {
        if (!$date) return null;
        
        $date = Carbon::parse($date);
        
        return ProductionWeek::where('customer_id', $customerId)
            ->where('year', $date->year)
            ->where('week_start', '<=', $date)
            ->orderBy('week_start', 'desc')
            ->first();
    }
    
    /**
     * Resolve mapping ETD ke week (cari atau buat baru)
     * 
     * @param int $customerId
     * @param string $etdDate (Y-m-d)
     * @param int|null $userId
     * @return int|null production_week_id
     */
    public static function resolveEtdMapping($customerId, $etdDate, $userId = null)
    {
        if (!$etdDate) return null;
        
        $etdDate = Carbon::parse($etdDate)->toDateString();
        
        // Cek mapping yang sudah ada
        $existingMapping = EtdMapping::where('customer_id', $customerId)
            ->where('etd_date', $etdDate)
            ->first();
        
        if ($existingMapping) {
            return $existingMapping->production_week_id;
        }
        
        // Auto-detect week
        $week = self::findWeekByDate($customerId, $etdDate);
        
        if ($week) {
            EtdMapping::create([
                'customer_id' => $customerId,
                'etd_date' => $etdDate,
                'production_week_id' => $week->id,
                'is_edited' => false,
            ]);
            return $week->id;
        }
        
        return null;
    }
    
    /**
     * Dapatkan semua tanggal ETD unik dari data SR
     * 
     * @param array $mappedData
     * @return array
     */
    public static function extractEtdDates($mappedData)
    {
        $dates = [];
        foreach ($mappedData as $item) {
            if (!empty($item['etd'])) {
                $dates[] = $item['etd'];
            }
        }
        
        if (empty($dates)) return [];
        
        return [
            'min' => min($dates),
            'max' => max($dates),
            'all' => array_unique($dates),
        ];
    }
}