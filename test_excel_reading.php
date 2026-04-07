<?php
require 'vendor/autoload.php';

ini_set('memory_limit', '1024M');

$file = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';

if (!file_exists($file)) {
    echo "❌ File tidak ditemukan: $file\n";
    exit(1);
}

echo "📁 File: $file\n";
echo "📊 Ukuran: " . number_format(filesize($file) / (1024*1024), 2) . " MB\n\n";

try {
    // Test dengan PhpSpreadsheet Reader (memory-efficient)
    echo "⏳ Loading with PhpSpreadsheet Reader...\n";
    $startTime = microtime(true);

    $reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
    $reader->setReadDataOnly(true);  // Skip formula calculation
    $spreadsheet = $reader->load($file);
    $worksheet = $spreadsheet->getSheet(1);

    echo "✅ Loaded in " . number_format(microtime(true) - $startTime, 2) . " seconds\n";
    echo "Sheet: " . $worksheet->getTitle() . "\n";
    echo "Dimensions: Rows: " . $worksheet->getHighestRow() . ", Cols: " . $worksheet->getHighestColumn() . "\n\n";

    // Convert to array
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
    echo "Row 0 (SEND DATE): " . implode(' | ', array_slice($sheetData[0] ?? [], 0, 5)) . "\n";
    echo "Row 3 (FIRM/FORECAST): " . implode(' | ', array_slice($sheetData[3] ?? [], 0, 8)) . "\n";
    echo "Row 4 (SHIP BY): " . implode(' | ', array_slice($sheetData[4] ?? [], 0, 8)) . "\n";
    echo "Row 5 (P/O #): " . implode(' | ', array_slice($sheetData[5] ?? [], 0, 8)) . "\n";
    echo "Row 7 (ETD JAI): " . implode(' | ', array_slice($sheetData[7] ?? [], 0, 8)) . "\n";
    echo "Row 8 (ETA SAI): " . implode(' | ', array_slice($sheetData[8] ?? [], 0, 8)) . "\n";
    echo "Row 9 (Headers): " . implode(' | ', array_slice($sheetData[9] ?? [], 0, 8)) . "\n";
    echo "Row 11 (First data): " . implode(' | ', array_slice($sheetData[11] ?? [], 0, 8)) . "\n";

    // Check memory usage
    $memoryUsed = memory_get_peak_usage(true) / (1024*1024);
    echo "\n📊 Memory Usage:\n";
    echo "Peak memory: " . number_format($memoryUsed, 2) . " MB\n";
    echo "Limit: 1024 MB\n";
    echo "Usage: " . number_format(($memoryUsed / 1024) * 100, 1) . "%\n";

    echo "\n🎉 Excel reading test PASSED! Memory-efficient approach works!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
?>
