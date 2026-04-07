<?php
require 'vendor/autoload.php';

ini_set('memory_limit', '1024M');

use App\Services\SR\SAIMapper;

$file = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';

// Load dengan Xlsx Reader (lebih cepat dari Maatwebsite Excel::toArray)
$reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
$reader->setReadDataOnly(true);
$spreadsheet = $reader->load($file);
$ws = $spreadsheet->getSheet(1);
$array = $ws->toArray(null, true, true, false);  // retain row keys (1-based)

// Convert 1-based to 0-based array untuk matcher
$sheetData = [];
foreach ($array as $rowIndex => $row) {
    $sheetData[$rowIndex - 1] = $row;  // Convert to 0-based
}

echo "Sheet data prepared: " . count($sheetData) . " rows\n\n";

// Display structure
echo "Row structure:\n";
for ($i = 0; $i < 12; $i++) {
    $row = $sheetData[$i] ?? [];
    $display = array_slice($row, 0, 8);
    // Filter out numeric keys for display
    $filtered = [];
    foreach ($display as $k => $v) {
        if (!is_numeric($k)) continue;  // Keep only the numeric indexed columns
        if (is_string($v)) {
            $filtered[] = substr($v, 0, 12);
        } else {
            $filtered[] = ($v === null ? '-' : $v);
        }
    }
    echo "  Row " . str_pad($i, 2, ' ', STR_PAD_LEFT) . ": " . implode(' | ', $filtered) . "\n";
}

echo "\n\nRunning SAIMapper...\n";

try {
    $mapper = new SAIMapper();
    $result = $mapper->map($sheetData, null, [
        'hidden_columns' => [],
        'hidden_rows' => [],
    ]);
    
    echo "✅ Success! Records: " . count($result) . "\n";
    
    if (!empty($result)) {
        $firm = count(array_filter($result, fn($r) => ($r['order_type'] ?? '') === 'FIRM'));
        $forecast = count(array_filter($result, fn($r) => ($r['order_type'] ?? '') === 'FORECAST'));
        echo "  FIRM: $firm, FORECAST: $forecast\n";
    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
?>
