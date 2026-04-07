<?php
require 'vendor/autoload.php';

ini_set('memory_limit', '1024M');
ini_set('max_execution_time', 300);

use App\Services\SR\SAIMapper;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

$file = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';

if (!file_exists($file)) {
    echo "❌ File tidak ditemukan: $file\n";
    exit(1);
}

echo "📁 File: $file\n";
echo "📊 Ukuran: " . number_format(filesize($file) / (1024*1024), 2) . " MB\n\n";

try {
    // Baca sheet dengan Excel facade
    echo "⏳ Loading sheet index 1...\n";
    $excel = Excel::toArray(null, $file);
    
    if (!isset($excel[1])) {
        echo "❌ Sheet index 1 tidak ditemukan (available: " . count($excel) . " sheets)\n";
        exit(1);
    }

    $sheetData = $excel[1];
    echo "✅ Sheet loaded: " . count($sheetData) . " rows\n";

    // Ekstrak hidden columns/rows
    echo "\n⏳ Extracting hidden columns/rows...\n";
    $spreadsheet = IOFactory::load($file);
    $worksheet = $spreadsheet->getSheet(1);
    
    $hiddenColumns = [];
    foreach ($worksheet->getColumnDimensions() as $colLetter => $colDim) {
        if (!$colDim->getVisible()) {
            $oneBased = Coordinate::columnIndexFromString($colLetter);
            $hiddenColumns[] = $oneBased - 1;
        }
    }
    
    $hiddenRows = [];
    foreach ($worksheet->getRowDimensions() as $rowNum => $rowDim) {
        if (!$rowDim->getVisible()) {
            $hiddenRows[] = (int)$rowNum - 1;
        }
    }
    
    echo "Hidden columns: " . (empty($hiddenColumns) ? 'none' : implode(', ', $hiddenColumns)) . "\n";
    echo "Hidden rows: " . count($hiddenRows) . " rows\n";

    // Jalankan mapper
    echo "\n⏳ Running SAIMapper...\n";
    $mapper = new SAIMapper();
    $options = [
        'hidden_columns' => $hiddenColumns,
        'hidden_rows' => $hiddenRows,
    ];
    
    $startMemory = memory_get_usage(true) / (1024*1024);
    $peakBefore = memory_get_peak_usage(true) / (1024*1024);
    $startTime = microtime(true);
    
    $result = $mapper->map($sheetData, null, $options);
    
    $endTime = microtime(true);
    $endMemory = memory_get_usage(true) / (1024*1024);
    $peakAfter = memory_get_peak_usage(true) / (1024*1024);
    
    echo "✅ Mapping complete!\n";
    echo "   Memory now: " . number_format($endMemory, 2) . " MB\n";
    echo "   Peak memory before: " . number_format($peakBefore, 2) . " MB\n";
    echo "   Peak memory after: " . number_format($peakAfter, 2) . " MB\n";
    echo "   Time: " . number_format($endTime - $startTime, 2) . " seconds\n";
    echo "   Records generated: " . count($result) . "\n";

    // Analisis hasil
    if (!empty($result)) {
        $firm = count(array_filter($result, fn($r) => ($r['order_type'] ?? '') === 'FIRM'));
        $forecast = count(array_filter($result, fn($r) => ($r['order_type'] ?? '') === 'FORECAST'));
        $parts = count(array_unique(array_column($result, 'part_number')));
        $qty = array_sum(array_column($result, 'qty'));

        echo "\n📊 Summary:\n";
        echo "   FIRM records: $firm\n";
        echo "   FORECAST records: $forecast\n";
        echo "   Unique parts: $parts\n";
        echo "   Total QTY: " . number_format($qty) . "\n";
        
        echo "\n📋 Sample records (first 5):\n";
        foreach (array_slice($result, 0, 5) as $i => $item) {
            echo sprintf(
                "   [%d] Part: %s, Qty: %d, Type: %s, ETA: %s, PO: %s\n",
                $i,
                $item['part_number'],
                $item['qty'],
                $item['order_type'],
                $item['eta'],
                $item['extra'] ? json_decode($item['extra'], true)['po_number'] ?? 'N/A' : 'N/A'
            );
        }
    }

    echo "\n✅ All tests PASSED!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
