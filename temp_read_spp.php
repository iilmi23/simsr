<?php

require_once 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

try {
    $spreadsheet = IOFactory::load('3. SPP 491D-564D JAI SR 3-2-2026.xls');
    $worksheet = $spreadsheet->getActiveSheet();

    echo 'Total rows: ' . $worksheet->getHighestRow() . PHP_EOL;
    echo 'Total columns: ' . $worksheet->getHighestColumn() . PHP_EOL;
    echo PHP_EOL;

    foreach ($worksheet->getRowIterator(1, min(30, $worksheet->getHighestRow())) as $row) {
        $cellIterator = $row->getCellIterator();
        $cellIterator->setIterateOnlyExistingCells(false);
        $rowData = [];
        foreach ($cellIterator as $cell) {
            $rowData[] = $cell->getValue() ?? 'NULL';
        }
        echo 'Row ' . $row->getRowIndex() . ': ' . implode(' | ', $rowData) . PHP_EOL;
    }
} catch (Exception $e) {
    echo 'Error: ' . $e->getMessage() . PHP_EOL;
}
?>