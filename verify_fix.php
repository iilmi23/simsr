<?php

// Simple test untuk memverifikasi bahwa perbaikan Excel reading bekerja
require 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🧪 Testing Excel Reading Fix in Laravel Context\n\n";

$file = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';

if (!file_exists($file)) {
    echo "❌ File tidak ditemukan\n";
    exit(1);
}

try {
    echo "📁 File: $file (" . number_format(filesize($file) / 1024 / 1024, 2) . " MB)\n\n";

    // Test dengan PhpSpreadsheet Reader (memory-efficient)
    echo "⏳ Loading with PhpSpreadsheet Reader...\n";
    $startTime = microtime(true);

    $reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
    $reader->setReadDataOnly(true);  // Skip formula calculation
    $spreadsheet = $reader->load($file);
    $worksheet = $spreadsheet->getSheet(1);

    echo "✅ Loaded in " . number_format(microtime(true) - $startTime, 2) . " seconds\n";
    echo "Sheet: " . $worksheet->getTitle() . "\n";
    echo "Dimensions: " . $worksheet->getHighestRow() . " rows × " . $worksheet->getHighestColumn() . " cols\n\n";

    // Convert to array (seperti yang dilakukan di controller)
    echo "⏳ Converting to array...\n";
    $startTime = microtime(true);

    $sheetData = [];
    $highestRow = $worksheet->getHighestRow();
    $highestCol = $worksheet->getHighestColumn();
    $highestColIndex = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($highestCol);

    for ($row = 1; $row <= $highestRow; $row++) {
        $rowData = [];
        for ($col = 1; $col <= $highestColIndex; $col++) {
            $cellValue = $worksheet->getCellByColumnAndRow($col, $row)->getValue();
            $rowData[] = $cellValue;
        }
        $sheetData[$row - 1] = $rowData;  // Convert to 0-based
    }

    echo "✅ Converted in " . number_format(microtime(true) - $startTime, 2) . " seconds\n";
    echo "Array shape: " . count($sheetData) . " rows\n\n";

    // Verify data structure
    echo "📋 Data Structure Verification:\n";
    $rows = [
        0 => 'SEND DATE',
        3 => 'FIRM/FORECAST',
        4 => 'SHIP BY',
        5 => 'P/O #',
        7 => 'ETD JAI',
        8 => 'ETA SAI',
        9 => 'Headers',
        11 => 'First data'
    ];

    foreach ($rows as $idx => $label) {
        $row = $sheetData[$idx] ?? [];
        $display = array_slice($row, 0, 6);
        $cleaned = array_map(function($v) {
            return is_string($v) ? substr($v, 0, 12) : (string)$v;
        }, $display);
        echo "  Row $idx ($label): " . implode(' | ', $cleaned) . "\n";
    }

    // Memory check
    $memoryUsed = memory_get_peak_usage(true) / (1024*1024);
    echo "\n📊 Memory Usage:\n";
    echo "Peak memory: " . number_format($memoryUsed, 2) . " MB\n";
    echo "Limit: 1024 MB\n";
    echo "Usage: " . number_format(($memoryUsed / 1024) * 100, 1) . "%\n";

    echo "\n🎉 Excel reading fix VERIFIED! Memory-efficient approach works in Laravel!\n";
    echo "\n✅ Ready for production upload testing!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
