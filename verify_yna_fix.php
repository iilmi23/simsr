#!/usr/bin/env php
<?php
/**
 * SCRIPT: Verifikasi YNA Mapper Perbaikan
 * 
 * Jalankan: php verify_yna_fix.php <path-to-yna-file.xlsx>
 * 
 * CATATAN: Harus dijalankan dari root Laravel project
 */

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\SR\YNAMapper;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

$filePath = $argv[1] ?? null;

if (!$filePath) {
    echo "Usage: php verify_yna_fix.php <path-to-file.xlsx>\n";
    exit(1);
}

if (!file_exists($filePath)) {
    echo "❌ File tidak ditemukan: {$filePath}\n";
    exit(1);
}

echo "========================================\n";
echo "   YNA MAPPER PERBAIKAN VERIFICATION\n";
echo "========================================\n\n";

echo "📄 File: " . basename($filePath) . "\n\n";

$mapper = new YNAMapper();
$issues = [];
$warnings = [];
$successes = [];

try {
    // Step 1: Map data
    echo "▶️  Step 1: Mapping data dari file...\n";
    $mapped = $mapper->map([], null, $filePath, 0, null);
    
    if (empty($mapped)) {
        echo "❌ Mapping menghasilkan 0 records\n";
        exit(1);
    }
    
    echo "✅ Mapping success: " . count($mapped) . " records\n\n";
    $successes[] = "Mapping completed with " . count($mapped) . " records";
    
    // Step 2: Analyze data quality
    echo "▶️  Step 2: Analyzing data quality...\n\n";
    
    $stats = [
        'total'           => count($mapped),
        'qty_zero'        => 0,
        'qty_positive'    => 0,
        'qty_invalid'     => 0,
        'etd_valid'       => 0,
        'etd_null'        => 0,
        'eta_valid'       => 0,
        'eta_null'        => 0,
        'week_set'        => 0,
        'week_null'       => 0,
        'parts_unique'    => count(array_unique(array_column($mapped, 'part_number'))),
    ];
    
    $sampleIssues = [];
    
    foreach ($mapped as $idx => $item) {
        // QTY analysis
        if ($item['qty'] === 0) {
            $stats['qty_zero']++;
        } elseif ($item['qty'] > 0) {
            $stats['qty_positive']++;
        } else {
            $stats['qty_invalid']++;
            if (count($sampleIssues) < 5) {
                $sampleIssues[] = "Record " . ($idx + 1) . ": qty negatif ({$item['qty']})";
            }
        }
        
        // Date analysis
        if (!empty($item['etd'])) {
            $stats['etd_valid']++;
        } else {
            $stats['etd_null']++;
            if (count($sampleIssues) < 5) {
                $sampleIssues[] = "Record " . ($idx + 1) . ": ETD kosong";
            }
        }
        
        if (!empty($item['eta'])) {
            $stats['eta_valid']++;
        } else {
            $stats['eta_null']++;
        }
        
        // Week analysis
        if (!empty($item['week'])) {
            $stats['week_set']++;
        } else {
            $stats['week_null']++;
        }
    }
    
    echo "📊 STATISTICS:\n";
    echo "   Total Records: {$stats['total']}\n";
    echo "   Unique Parts: {$stats['parts_unique']}\n\n";
    
    echo "QTY Analysis:\n";
    echo "   ✅ Positive: {$stats['qty_positive']} (" . round($stats['qty_positive']*100/$stats['total'], 1) . "%)\n";
    echo "   ℹ️  Zero: {$stats['qty_zero']} (" . round($stats['qty_zero']*100/$stats['total'], 1) . "%)\n";
    if ($stats['qty_invalid'] > 0) {
        echo "   ❌ Invalid: {$stats['qty_invalid']} (" . round($stats['qty_invalid']*100/$stats['total'], 1) . "%)\n";
        $issues[] = "Found {$stats['qty_invalid']} records dengan qty invalid";
    }
    echo "\n";
    
    echo "ETD/ETA Analysis:\n";
    echo "   ✅ Valid ETD: {$stats['etd_valid']} (" . round($stats['etd_valid']*100/$stats['total'], 1) . "%)\n";
    if ($stats['etd_null'] > 0) {
        echo "   ❌ NULL ETD: {$stats['etd_null']} (" . round($stats['etd_null']*100/$stats['total'], 1) . "%)\n";
        $issues[] = "Found {$stats['etd_null']} records dengan ETD kosong";
    }
    echo "   ✅ Valid ETA: {$stats['eta_valid']} (" . round($stats['eta_valid']*100/$stats['total'], 1) . "%)\n";
    if ($stats['eta_null'] > 0) {
        echo "   ℹ️  NULL ETA (fallback): {$stats['eta_null']} (" . round($stats['eta_null']*100/$stats['total'], 1) . "%)\n";
        $successes[] = "ETA fallback working (ETD + 42 days)";
    }
    echo "\n";
    
    echo "Week Analysis:\n";
    echo "   ✅ Week Set: {$stats['week_set']} (" . round($stats['week_set']*100/$stats['total'], 1) . "%)\n";
    echo "   ℹ️  Week NULL (need auto-resolve): {$stats['week_null']} (" . round($stats['week_null']*100/$stats['total'], 1) . "%)\n";
    echo "\n";
    
    if (!empty($sampleIssues)) {
        echo "⚠️  Sample Issues Found:\n";
        foreach ($sampleIssues as $issue) {
            echo "   - {$issue}\n";
        }
        echo "\n";
    }
    
    // Step 3: Check week labels
    echo "▶️  Step 3: Checking for week labels in file...\n";
    $weekMap = $mapper->extractWeekNumbersFromFile($filePath);
    
    if (empty($weekMap)) {
        echo "ℹ️  No explicit week labels found\n";
        echo "ℹ️  Week akan di-resolve otomatis dari ProductionWeek berdasarkan ETD\n\n";
        $successes[] = "Week resolution akan menggunakan ProductionWeek (recommended)";
    } else {
        echo "✅ Found {count($weekMap)} week labels\n";
        foreach (array_slice($weekMap, 0, 5) as $col => $week) {
            echo "   - Column " . chr(64 + ceil(($col + 1) / 26)) . ": Week {$week}\n";
        }
        echo "   ...\n\n";
        $successes[] = "Week labels extracted from file";
    }
    
    // Step 4: Check ETD range
    echo "▶️  Step 4: Checking ETD date range...\n";
    [$minEtd, $maxEtd] = $mapper->extractEtdRangeFromFile($filePath);
    
    if ($minEtd && $maxEtd) {
        $minDate = Carbon::parse($minEtd);
        $maxDate = Carbon::parse($maxEtd);
        $days = $minDate->diffInDays($maxDate);
        $weeks = $days / 7;
        
        echo "✅ ETD Range: {$minEtd} to {$maxEtd}\n";
        echo "   Span: {$days} days (~" . round($weeks, 1) . " weeks)\n\n";
        $successes[] = "ETD range extracted successfully";
    } else {
        echo "❌ Could not extract ETD range\n\n";
        $issues[] = "ETD range extraction failed";
    }
    
    // Step 5: Sample data
    echo "▶️  Step 5: Sample data (first 3 records)...\n";
    foreach (array_slice($mapped, 0, 3) as $idx => $item) {
        echo "\n   Record " . ($idx + 1) . ":\n";
        echo "   - Part: {$item['part_number']}\n";
        echo "   - QTY: {$item['qty']}\n";
        echo "   - ETD: {$item['etd']} | ETA: {$item['eta']}\n";
        echo "   - Week: " . ($item['week'] ?? 'NULL') . " | Month: {$item['month']}\n";
    }
    echo "\n";
    
    // SUMMARY
    echo "========================================\n";
    echo "                SUMMARY\n";
    echo "========================================\n\n";
    
    if (!empty($successes)) {
        echo "✅ SUCCESSES:\n";
        foreach ($successes as $s) {
            echo "   ✓ {$s}\n";
        }
        echo "\n";
    }
    
    if (!empty($warnings)) {
        echo "⚠️  WARNINGS:\n";
        foreach ($warnings as $w) {
            echo "   ! {$w}\n";
        }
        echo "\n";
    }
    
    if (!empty($issues)) {
        echo "❌ ISSUES:\n";
        foreach ($issues as $issue) {
            echo "   ✗ {$issue}\n";
        }
        echo "\n";
    }
    
    // Final recommendation
    echo "========================================\n";
    if (empty($issues)) {
        echo "✅ DATA QUALITY: EXCELLENT\n";
        echo "   File siap untuk upload ke database\n";
        $exitCode = 0;
    } elseif (count($issues) <= 2) {
        echo "⚠️  DATA QUALITY: ACCEPTABLE\n";
        echo "   Ada beberapa issues tapi tidak critical\n";
        echo "   Rekomendasi: Review issues sebelum upload\n";
        $exitCode = 1;
    } else {
        echo "❌ DATA QUALITY: PROBLEMATIC\n";
        echo "   Ada banyak issues, investigate lebih lanjut\n";
        $exitCode = 2;
    }
    echo "========================================\n";
    
} catch (\Throwable $e) {
    echo "❌ FATAL ERROR: " . $e->getMessage() . "\n";
    echo "\nTrace:\n" . $e->getTraceAsString() . "\n";
    $exitCode = 3;
}

exit($exitCode ?? 0);
