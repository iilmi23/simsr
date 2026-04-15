<?php
require 'vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;

// Check if attachment file exists
$attachmentFile = __DIR__ . '/storage/app/private/temp/upload.xlsx';
if (file_exists($attachmentFile)) {
    $file = $attachmentFile;
} else {
    // Try to find the uploaded file from the request
    echo "Looking for SAI file...\n";
    $files = glob(__DIR__ . '/*.xlsx');
    if (empty($files)) {
        echo "No xlsx files found in " . __DIR__ . "\n";
        exit(1);
    }
    $file = array_pop($files);
    echo "Found: $file\n";
}

echo "Loading: $file\n";

$reader = IOFactory::createReader('Xlsx');
$reader->setReadDataOnly(true);
$spreadsheet = $reader->load($file);

// Try sheet index 1 (List Order for SAI)
$sheet = $spreadsheet->getSheet(1);

echo "\nSheet: " . $sheet->getTitle() . " | Rows: " . $sheet->getHighestRow() . " | Cols: " . $sheet->getHighestColumn() . "\n\n";

// Check headers (row 11 = index 10)
echo "=== ROW 11 (Headers) ===\n";
$headers = $sheet->rangeToArray('A11:D11');
echo "Col A (No): " . ($headers[0][0] ?? 'empty') . "\n";
echo "Col B (PART NUMBER): " . ($headers[0][1] ?? 'empty') . "\n";
echo "Col C (BUPPIN): " . ($headers[0][2] ?? 'empty') . "\n";
echo "Col D (Last Cum): " . ($headers[0][3] ?? 'empty') . "\n";

// Check data rows (row 13+ = index 12+)
echo "\n=== ROW 13 (First data row) ===\n";
$row13 = $sheet->rangeToArray('A13:D13');
echo "Col A (No): " . var_export($row13[0][0], true) . "\n";
echo "Col B (PART NUMBER): " . var_export($row13[0][1], true) . "\n";
echo "Col C (BUPPIN): " . var_export($row13[0][2], true) . "\n";
echo "Col D (Last Cum): " . var_export($row13[0][3], true) . "\n";

echo "\n=== ROW 15 (Second data row, skipping CUM row 14) ===\n";
$row15 = $sheet->rangeToArray('A15:D15');
echo "Col A (No): " . var_export($row15[0][0], true) . "\n";
echo "Col B (PART NUMBER): " . var_export($row15[0][1], true) . "\n";
echo "Col C (BUPPIN): " . var_export($row15[0][2], true) . "\n";
echo "Col D (Last Cum): " . var_export($row15[0][3], true) . "\n";

echo "\n=== ROW 17 ===\n";
$row17 = $sheet->rangeToArray('A17:D17');
echo "Col A (No): " . var_export($row17[0][0], true) . "\n";
echo "Col B (PART NUMBER): " . var_export($row17[0][1], true) . "\n";
echo "Col C (BUPPIN): " . var_export($row17[0][2], true) . "\n";
echo "Col D (Last Cum): " . var_export($row17[0][3], true) . "\n";
