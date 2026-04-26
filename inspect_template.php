<?php

/**
 * Inspect Template Structure
 * 
 * Jalankan: php artisan tinker
 * Paste code ini untuk melihat struktur template Excel
 */

use PhpOffice\PhpSpreadsheet\IOFactory;

$filePath = 'Template_Week_YNA_2026.xlsx'; // Letakkan file di root project

// Load spreadsheet
$reader = IOFactory::createReader('Xlsx');
$spreadsheet = $reader->load($filePath);
$worksheet = $spreadsheet->getSheet(0); // Sheet pertama

$highestRow = $worksheet->getHighestRow();
$highestCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString(
    $worksheet->getHighestColumn()
);

echo "=== TEMPLATE STRUCTURE ===\n\n";
echo "Sheet Name: " . $worksheet->getTitle() . "\n";
echo "Highest Row: $highestRow\n";
echo "Highest Column: $highestCol\n\n";

// Display headers (row 1-5)
echo "HEADER ROWS:\n";
echo str_repeat("─", 100) . "\n";

for ($row = 1; $row <= min(5, $highestRow); $row++) {
    echo "Row $row: ";
    for ($col = 1; $col <= $highestCol; $col++) {
        $cell = $worksheet->getCellByColumnAndRow($col, $row);
        $value = (string) $cell->getValue();
        $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
        
        echo "[$colLetter: " . trim($value) . "] ";
    }
    echo "\n";
}

echo "\nDATA SAMPLE (First 10 rows):\n";
echo str_repeat("─", 100) . "\n";

for ($row = 2; $row <= min(11, $highestRow); $row++) {
    echo "Row $row: ";
    for ($col = 1; $col <= $highestCol; $col++) {
        $cell = $worksheet->getCellByColumnAndRow($col, $row);
        $value = (string) $cell->getValue();
        echo "[" . trim($value) . "] ";
    }
    echo "\n";
}

echo "\n✓ Sekarang identifikasi:\n";
echo "  1. Kolom mana yang punya WEEK NUMBER?\n";
echo "  2. Kolom mana yang punya START DATE / FIRST DATE?\n";
echo "  3. Format tanggalnya apa? (MM/DD/YYYY, DD/MM/YYYY, atau format lain?)\n";
echo "  4. Header ada di row berapa? (row 1, 2, atau berapa?)\n";
