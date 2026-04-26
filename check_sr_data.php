<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\SR;

echo "Total SR records: " . SR::count() . PHP_EOL;

echo "Sample SR records:" . PHP_EOL;
$records = SR::limit(5)->get();
foreach($records as $record) {
    echo "  - ID: {$record->id}, Customer: {$record->customer}, Part: {$record->part_number}, Qty: {$record->qty}" . PHP_EOL;
}

echo PHP_EOL . "Summary query (like in SummaryController):" . PHP_EOL;
$summary = SR::query()
    ->selectRaw('
        MIN(id)           as id,
        customer,
        port,
        source_file,
        upload_batch,
        MIN(sheet_name)   as sheet_name,
        MIN(created_at)   as upload_date,
        COUNT(*)          as total_items,
        SUM(qty)          as total_qty,
        SUM(CASE WHEN order_type = \'FIRM\'     THEN qty ELSE 0 END) as firm_qty,
        SUM(CASE WHEN order_type = \'FORECAST\' THEN qty ELSE 0 END) as forecast_qty,
        COUNT(CASE WHEN order_type = \'FIRM\'     THEN 1 END)        as firm_count,
        COUNT(CASE WHEN order_type = \'FORECAST\' THEN 1 END)        as forecast_count,
        COUNT(DISTINCT part_number)                                   as unique_parts,
        MIN(etd)          as earliest_etd,
        MAX(etd)          as latest_etd
    ')
    ->groupBy('customer', 'port', 'source_file', 'upload_batch', 'sheet_name')
    ->orderByRaw('MIN(created_at) desc')
    ->get();

echo "Summary results count: " . $summary->count() . PHP_EOL;
foreach($summary as $item) {
    echo "  - {$item->customer}: {$item->source_file} ({$item->total_items} items)" . PHP_EOL;
}