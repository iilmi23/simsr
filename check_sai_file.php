<?php
require 'vendor/autoload.php';

ini_set('memory_limit', '1024M');

$file = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';
if (!file_exists($file)) {
    printf("File tidak ada: %s\n", $file);
    exit(1);
}

echo "Checking file: $file\n";
echo "File size: " . (filesize($file) / (1024*1024)) . " MB\n\n";

try {
    $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file);
    echo "Total sheets: " . $spreadsheet->getSheetCount() . "\n";
    
    for ($i = 0; $i < $spreadsheet->getSheetCount(); $i++) {
        $ws = $spreadsheet->getSheet($i);
        $name = $ws->getTitle();
        $rows = $ws->getHighestRow();
        $cols = $ws->getHighestColumn();
        printf("Sheet %d: '%s' - Rows: %d | Cols: %s\n", $i, $name, $rows, $cols);
        
        // Check first 15 rows to validate structure
        if ($i === 1) {  // Sheet index 1
            echo "\n--- Sheet 1 Structure ---\n";
            for ($r = 1; $r <= min(15, $rows); $r++) {
                $rowData = [];
                for ($c = 1; $c <= 10; $c++) {
                    $val = $ws->getCellByColumnAndRow($c, $r)->getValue();
                    $rowData[] = (is_string($val) ? substr($val, 0, 15) : $val);
                }
                printf("Row %2d: %s\n", $r, implode(" | ", $rowData));
            }
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
