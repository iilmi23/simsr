<?php

require 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$filePath = __DIR__ . '/Template_Week_YNA_2026.xlsx';

try {
    $reader = IOFactory::createReader('Xlsx');
    $spreadsheet = $reader->load($filePath);
    $worksheet = $spreadsheet->getSheet(0);
    
    echo "=== TEMPLATE STRUCTURE ===\n\n";
    echo "Sheet Name: " . $worksheet->getTitle() . "\n";
    echo "Highest Row: " . $worksheet->getHighestRow() . "\n";
    echo "Highest Column: " . $worksheet->getHighestColumn() . "\n\n";
    
    echo "=== HEADER ROWS (1-3) ===\n";
    for ($row = 1; $row <= 3; $row++) {
        echo "Row $row: ";
        for ($col = 1; $col <= 10; $col++) {
            $cell = $worksheet->getCellByColumnAndRow($col, $row);
            $value = trim((string) $cell->getValue());
            if ($value) echo "[$value] ";
        }
        echo "\n";
    }
    
    echo "\n=== DATA ROWS (2-7) ===\n";
    for ($row = 2; $row <= 7; $row++) {
        echo "Row $row: ";
        for ($col = 1; $col <= 10; $col++) {
            $cell = $worksheet->getCellByColumnAndRow($col, $row);
            $value = trim((string) $cell->getValue());
            echo "[$value] ";
        }
        echo "\n";
    }
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
