<?php
require 'vendor/autoload.php';

ini_set('memory_limit', '1024M');

$file = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';
echo "Loading Excel file with Xlsx Reader...\n";
echo "File: $file\n\n";

$startTime = microtime(true);
$reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
$reader->setReadDataOnly(true);  // Read values only, not formulas
$spreadsheet = $reader->load($file);

echo "Loaded in " . number_format(microtime(true) - $startTime, 2) . " seconds\n";

$ws = $spreadsheet->getSheet(1);
echo "Sheet: " . $ws->getTitle() . "\n";
echo "Dimensions: Rows: " . $ws->getHighestRow() . ", Cols: " . $ws->getHighestColumn() . "\n\n";

// Try to get 2D array
echo "Converting to array...\n";
$startTime = microtime(true);
$array = $ws->toArray(null, true, true, false);
echo "Converted in " . number_format(microtime(true) - $startTime, 2) . " seconds\n";
echo "Array shape: " . count($array) . " rows\n";
echo "First row cols: " . (isset($array[1]) ? count($array[1]) : 0) . "\n";

echo "\nFirst 5 rows:\n";
for ($i = 1; $i <= 5; $i++) {
    $row = $array[$i] ?? [];
    $display = array_slice($row, 0, 5);
    echo "Row $i: " . implode(' | ', $display) . "\n";
}
?>
?>
