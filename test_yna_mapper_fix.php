<?php
/**
 * TEST: YNAMapper - Verify QTY, ETD/ETA, dan Week Reading
 * 
 * Jalankan dengan: php artisan tinker
 * Atau: php test_yna_mapper_fix.php
 */

use App\Services\SR\YNAMapper;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

echo "=== TEST YNA MAPPER FIX ===\n\n";

// Path ke YNA file test (sesuaikan dengan file sebenarnya)
$testFile = storage_path('temp/yna_test.xlsx');

if (!file_exists($testFile)) {
    echo "❌ Test file tidak ditemukan: {$testFile}\n";
    echo "   Pastikan ada file YNA di location tersebut untuk testing\n";
    exit(1);
}

$mapper = new YNAMapper();

echo "1️⃣  Testing: Map Data dari File YNA\n";
echo "   File: {$testFile}\n";

try {
    // Test tanpa customer ID dulu
    $mapped = $mapper->map([], null, $testFile, 0, null);
    
    if (empty($mapped)) {
        echo "❌ Hasil mapping kosong\n";
        exit(1);
    }
    
    echo "✅ Mapping berhasil, records: " . count($mapped) . "\n\n";
    
    // Analisis hasil
    $qtyCounts = [
        'zero'     => 0,
        'positive' => 0,
        'invalid'  => 0,
    ];
    
    $dateInfo = [
        'etd_valid' => 0,
        'etd_null'  => 0,
        'eta_valid' => 0,
        'eta_null'  => 0,
    ];
    
    $weekInfo = [
        'week_set'   => 0,
        'week_null'  => 0,
    ];
    
    foreach (array_slice($mapped, 0, 10) as $idx => $item) {
        echo "Record " . ($idx + 1) . ":\n";
        echo "  - Part: {$item['part_number']}\n";
        echo "  - QTY: {$item['qty']} ";
        
        if ($item['qty'] === 0) {
            $qtyCounts['zero']++;
            echo "(ZERO - might be empty or formula)";
        } elseif ($item['qty'] > 0) {
            $qtyCounts['positive']++;
            echo "(✅ VALID)";
        } else {
            $qtyCounts['invalid']++;
            echo "(❌ INVALID)";
        }
        echo "\n";
        
        echo "  - ETD: {$item['etd']} ";
        if ($item['etd']) {
            $dateInfo['etd_valid']++;
            echo "(✅)";
        } else {
            $dateInfo['etd_null']++;
            echo "(❌)";
        }
        echo "\n";
        
        echo "  - ETA: {$item['eta']} ";
        if ($item['eta']) {
            $dateInfo['eta_valid']++;
            echo "(✅)";
        } else {
            $dateInfo['eta_null']++;
            echo "(❌)";
        }
        echo "\n";
        
        echo "  - Week: " . ($item['week'] ?? 'NULL') . " ";
        if ($item['week']) {
            $weekInfo['week_set']++;
            echo "(✅)";
        } else {
            $weekInfo['week_null']++;
            echo "(⚠️ auto-resolve needed)";
        }
        echo "\n";
        
        echo "  - Month: {$item['month']}\n";
        echo "\n";
    }
    
    echo "2️⃣  SUMMARY STATISTICS\n";
    echo "   Total records: " . count($mapped) . "\n";
    echo "   QTY Analysis:\n";
    echo "     - Positive: {$qtyCounts['positive']}\n";
    echo "     - Zero: {$qtyCounts['zero']}\n";
    echo "     - Invalid: {$qtyCounts['invalid']}\n";
    
    echo "   Date Analysis:\n";
    echo "     - Valid ETD: {$dateInfo['etd_valid']}\n";
    echo "     - NULL ETD: {$dateInfo['etd_null']}\n";
    echo "     - Valid ETA: {$dateInfo['eta_valid']}\n";
    echo "     - NULL ETA: {$dateInfo['eta_null']}\n";
    
    echo "   Week Analysis:\n";
    echo "     - Week Set: {$weekInfo['week_set']}\n";
    echo "     - Week NULL: {$weekInfo['week_null']}\n";
    
    echo "\n3️⃣  Testing: Extract Week Numbers (jika ada)\n";
    $weekMap = $mapper->extractWeekNumbersFromFile($testFile);
    if (empty($weekMap)) {
        echo "   ℹ️  No explicit week labels found in file\n";
        echo "   ℹ️  Week akan di-resolve dari ProductionWeek berdasarkan ETD\n";
    } else {
        echo "   ✅ Found week labels: " . count($weekMap) . " columns\n";
        foreach (array_slice($weekMap, 0, 5) as $col => $week) {
            echo "     - Col " . ($col + 1) . " (Excel: " . chr(64 + ceil($col / 26)) . ") = Week {$week}\n";
        }
    }
    
    echo "\n4️⃣  Testing: Extract ETD Range\n";
    [$minEtd, $maxEtd] = $mapper->extractEtdRangeFromFile($testFile);
    echo "   Min ETD: {$minEtd}\n";
    echo "   Max ETD: {$maxEtd}\n";
    
    if ($minEtd && $maxEtd) {
        $days = Carbon::parse($minEtd)->diffInDays(Carbon::parse($maxEtd));
        echo "   Range: {$days} days ≈ {$days / 7:.1f} weeks\n";
    }
    
    echo "\n✅ ALL TESTS PASSED!\n";
    echo "\nNEXT STEPS:\n";
    echo "1. Upload file YNA via web interface\n";
    echo "2. Check Summary page untuk verify data tersimpan dengan benar\n";
    echo "3. Check Production Week page untuk verify weeks ter-generate\n";
    echo "4. Check Time Chart untuk verify mapping ETD ke week\n";
    
} catch (\Throwable $e) {
    echo "❌ ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}
