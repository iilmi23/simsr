<?php

namespace App\Http\Controllers;

use App\Models\EtdMapping;
use App\Models\Customer;
use App\Models\ProductionWeek;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class EtdMappingController extends Controller
{
    /**
     * Tampilkan ETD mapping untuk customer tertentu
     */
    public function index($customerId)
    {
        $customer = Customer::findOrFail($customerId);
        
        $mappings = EtdMapping::with('productionWeek')
            ->where('customer_id', $customerId)
            ->orderBy('etd_date', 'asc')
            ->get()
            ->map(function ($mapping) use ($customerId) {
                // Ambil semua weeks yang tersedia untuk customer ini
                $availableWeeks = ProductionWeek::where('customer_id', $customerId)
                    ->orderBy('year', 'asc')
                    ->orderBy('month_number', 'asc')
                    ->orderBy('week_no', 'asc')
                    ->get()
                    ->map(function ($week) {
                        return [
                            'id' => $week->id,
                            'label' => "{$week->month_name} {$week->year} - Week {$week->week_no} (" . $week->week_start->format('d/m/Y') . ")",
                        ];
                    });
                
                return [
                    'id' => $mapping->id,
                    'etd_date' => $mapping->etd_date->format('Y-m-d'),
                    'production_week_id' => $mapping->production_week_id,
                    'week_label' => $mapping->productionWeek ? 
                        "{$mapping->productionWeek->month_name} {$mapping->productionWeek->year} W{$mapping->productionWeek->week_no}" : '-',
                    'is_edited' => $mapping->is_edited,
                    'available_weeks' => $availableWeeks,
                ];
            });
        
        return response()->json([
            'success' => true,
            'customer' => $customer,
            'mappings' => $mappings,
        ]);
    }
    
    /**
     * Update ETD mapping
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'production_week_id' => 'required|exists:production_weeks,id',
        ]);
        
        $mapping = EtdMapping::findOrFail($id);
        
        $mapping->update([
            'production_week_id' => $request->production_week_id,
            'is_edited' => true,
            'edited_by' => Auth::id(),
            'edited_at' => now(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Mapping berhasil diupdate',
        ]);
    }
    
    /**
     * Hapus ETD mapping
     */
    public function destroy($id)
    {
        $mapping = EtdMapping::findOrFail($id);
        $mapping->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Mapping berhasil dihapus',
        ]);
    }
    
    /**
     * Sync semua ETD dari SR ke etd_mappings
     */
    public function sync(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
        ]);
        
        $customerId = $request->customer_id;
        $customerCode = Customer::find($customerId)->code;
        
        // Ambil semua ETD unik dari tabel srs
        $etdDates = DB::table('srs')
            ->where('customer', $customerCode)
            ->whereNotNull('etd')
            ->distinct()
            ->pluck('etd')
            ->toArray();
        
        $synced = 0;
        $errors = [];
        
        foreach ($etdDates as $etdDate) {
            try {
                $week = ProductionWeek::findByDate($customerId, $etdDate);
                
                if ($week) {
                    EtdMapping::updateOrCreate(
                        [
                            'customer_id' => $customerId,
                            'etd_date' => $etdDate,
                        ],
                        [
                            'production_week_id' => $week->id,
                            'is_edited' => false,
                        ]
                    );
                    $synced++;
                }
            } catch (\Exception $e) {
                $errors[] = $etdDate . ': ' . $e->getMessage();
            }
        }
        
        return redirect()->back()->with('success', "Sync selesai: {$synced} ETD ter-mapping. Error: " . count($errors));
    }
}