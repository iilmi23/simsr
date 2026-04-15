<?php
/**
 * Test upload YC untuk debugging
 * 
 * Jalankan: php test_upload_yc.php
 */

require 'vendor/autoload.php';

use App\Services\SR\YCMapper;
use Illuminate\Foundation\Application;
use Illuminate\Contracts\Console\Kernel;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

echo "=== TEST YC MAPPER UPLOAD ===\n\n";

// Cek PHP settings
echo "PHP Configuration:\n";
echo "- max_execution_time: " . ini_get('max_execution_time') . "s\n";
echo "- memory_limit: " . ini_get('memory_limit') . "\n";
echo "- upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "- post_max_size: " . ini_get('post_max_size') . "\n\n";

// Test memory usage
echo "Current Memory Usage: " . number_format(memory_get_usage() / 1024 / 1024, 2) . " MB\n";
echo "Peak Memory Usage: " . number_format(memory_get_peak_usage() / 1024 / 1024, 2) . " MB\n\n";

// Simulate YC mapper behavior
echo "Testing YCMapper structure...\n";

$mapper = new YCMapper();

// Create mock data
$mockSheet = array_fill(0, 100, array_fill(0, 50, ''));
$mockSheet[6][1] = 'SR001';
$mockSheet[10][1] = 'PORT1';
$mockSheet[12][1] = 'YC';
$mockSheet[19][4] = 'PRODUCT NO';
$mockSheet[20][4] = 'PART001';

$allSheets = [
    0 => $mockSheet,
    1 => $mockSheet,
];

$sheetNames = [
    0 => 'Sheet1',
    1 => 'Sheet2',
];

echo "Mock data created (2 sheets x 100 rows x 50 cols)\n";
echo "Memory after mock creation: " . number_format(memory_get_usage() / 1024 / 1024, 2) . " MB\n\n";

try {
    echo "Calling mapAllSheets...\n";
    $result = $mapper->mapAllSheets($allSheets, $sheetNames);

    echo "✓ mapAllSheets completed\n";
    echo "  Result type: " . gettype($result) . "\n";
    echo "  Result keys: " . implode(', ', array_keys($result)) . "\n";

    // Check structure
    foreach ($result as $idx => $records) {
        echo "  - Sheet {$idx}: " . count($records) . " records\n";
    }

    echo "\nMemory after mapAllSheets: " . number_format(memory_get_usage() / 1024 / 1024, 2) . " MB\n";

    // Test flatten
    echo "\nTesting flatten operation...\n";
    $flattened = [];
    foreach ($result as $sheetIndex => $sheetRecords) {
        if (!is_array($sheetRecords)) {
            echo "  WARNING: Sheet {$sheetIndex} is not array: " . gettype($sheetRecords) . "\n";
            continue;
        }
        $flattened = array_merge($flattened, $sheetRecords);
    }
    echo "✓ Flatten completed\n";
    echo "  Total records: " . count($flattened) . "\n";
    echo "  Memory after flatten: " . number_format(memory_get_usage() / 1024 / 1024, 2) . " MB\n";

} catch (\Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
}

echo "\n=== TEST COMPLETE ===\n";
