<?php

require_once 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$spreadsheet = IOFactory::load('3. JAI 495D 564D Template FINAL WK 3-2-2026.xlsx');
$worksheet = $spreadsheet->getActiveSheet();

echo 'Total rows: ' . $worksheet->getHighestRow() . PHP_EOL;
echo 'Total columns: ' . $worksheet->getHighestColumn() . PHP_EOL;
echo PHP_EOL;

foreach ($worksheet->getRowIterator(1, 30) as $row) {
    $cellIterator = $row->getCellIterator();
    $cellIterator->setIterateOnlyExistingCells(false);
    $rowData = [];
    foreach ($cellIterator as $cell) {
        $rowData[] = $cell->getValue() ?? 'NULL';
    }
    echo 'Row ' . $row->getRowIndex() . ': ' . implode(' | ', $rowData) . "\n";
}
?>