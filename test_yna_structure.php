<?php
require 'vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$file = 'JAI 495D 564D Template FINAL WK 3-2-2026.xlsx';
if (!file_exists($file)) {
    die("File not found: $file\n");
}

$reader = IOFactory::createReader('Xlsx');
$spreadsheet = $reader->load($file);

echo "=== SHEETS ===\n";
echo "Total: " . $spreadsheet->getSheetCount() . " sheets\n";
foreach ($spreadsheet->getWorksheetIterator() as $sheet) {
    echo "  - " . $sheet->getTitle() . "\n";
}

$ws = $spreadsheet->getActiveSheet();
echo "\n=== ACTIVE SHEET: " . $ws->getTitle() . " ===\n";
echo "Dimensions: " . $ws->calculateWorksheet()->getDimension() . "\n";

// Read all rows with full columns A-Z
$allRows = [];
foreach ($ws->getRowIterator() as $row) {
    $rowData = [];
    foreach ($row->getCellIterator() as $cell) {
        $rowData[] = $cell->getCalculatedValue();
    }
    $allRows[] = $rowData;
}

echo "Total rows: " . count($allRows) . "\n\n";

// Find PSA# rows
$psaIndices = [];
foreach ($allRows as $idx => $row) {
    $fVal = trim((string)($row[5] ?? ''));
    if ($fVal === 'PSA#') {
        $psaIndices[] = $idx;
    }
}

echo "=== PSA# BLOCKS FOUND ===\n";
echo "Total blocks: " . count($psaIndices) . "\n";
foreach ($psaIndices as $psa) {
    echo "  Block at row " . ($psa + 1) . "\n";
}

echo "\n=== FIRST BLOCK ANALYSIS ===\n";
if (!empty($psaIndices)) {
    $psaIdx = $psaIndices[0];
    echo "PSA Index: " . ($psaIdx + 1) . "\n\n";
    
    // Show rows around first PSA
    for ($i = $psaIdx; $i < min($psaIdx + 10, count($allRows)); $i++) {
        $rowData = $allRows[$i];
        echo sprintf(
            "[%3d] F=%s | H=%s | I=%s | J=%s | K=%s | L=%s | M=%s\n",
            $i + 1,
            $rowData[5] ?? '',
            $rowData[7] ?? '',
            $rowData[8] ?? '',
            $rowData[9] ?? '',
            $rowData[10] ?? '',
            $rowData[11] ?? '',
            $rowData[12] ?? ''
        );
    }
}

echo "\n=== ETD/ETA COLUMNS ANALYSIS ===\n";
if (!empty($psaIndices)) {
    $psaIdx = $psaIndices[0];
    if (isset($allRows[$psaIdx + 3])) {
        $etdRow = $allRows[$psaIdx + 3];
        echo "ETD Row (" . ($psaIdx + 4) . "):\n";
        echo "  Col I (label): " . ($etdRow[8] ?? '') . "\n";
        echo "  Data cols (J onwards): ";
        for ($c = 9; $c < min(count($etdRow), 20); $c++) {
            echo "[" . ($c - 8) . "]=" . $etdRow[$c] . " ";
        }
        echo "\n\n";
    }
    
    if (isset($allRows[$psaIdx + 4])) {
        $etaRow = $allRows[$psaIdx + 4];
        echo "ETA Row (" . ($psaIdx + 5) . "):\n";
        echo "  Col I (label): " . ($etaRow[8] ?? '') . "\n";
        echo "  Data cols (J onwards): ";
        for ($c = 9; $c < min(count($etaRow), 20); $c++) {
            echo "[" . ($c - 8) . "]=" . $etaRow[$c] . " ";
        }
        echo "\n\n";
    }
    
    if (isset($allRows[$psaIdx + 5])) {
        $netRow = $allRows[$psaIdx + 5];
        echo "NET Row (" . ($psaIdx + 6) . "):\n";
        echo "  Col I (label): " . ($netRow[8] ?? '') . "\n";
        echo "  Data cols (J onwards): ";
        for ($c = 9; $c < min(count($netRow), 20); $c++) {
            echo "[" . ($c - 8) . "]=" . $netRow[$c] . " ";
        }
        echo "\n";
    }
}
