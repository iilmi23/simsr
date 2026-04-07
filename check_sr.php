<?php

require_once 'vendor/autoload.php';

use App\Models\SR;

echo "=== SR Database Check ===\n";
echo "Total SR records: " . SR::count() . "\n\n";

echo "Latest 5 SR records:\n";
$latest = SR::orderBy('created_at', 'desc')->limit(5)->get();
foreach ($latest as $record) {
    echo sprintf(
        "ID: %d, Customer: %s, File: %s, Batch: %s, Part: %s, Qty: %d, Created: %s\n",
        $record->id,
        $record->customer,
        substr($record->source_file, 0, 30),
        substr($record->upload_batch, 0, 8) . '...',
        $record->part_number,
        $record->qty,
        $record->created_at->format('Y-m-d H:i:s')
    );
}

echo "\nUpload batches summary:\n";
$batches = SR::selectRaw('upload_batch, COUNT(*) as count, SUM(qty) as total_qty, MAX(created_at) as latest_upload')
    ->groupBy('upload_batch')
    ->orderBy('latest_upload', 'desc')
    ->limit(3)
    ->get();

foreach ($batches as $batch) {
    echo sprintf(
        "Batch: %s... Count: %d, Total Qty: %d, Latest: %s\n",
        substr($batch->upload_batch, 0, 8),
        $batch->count,
        $batch->total_qty,
        $batch->latest_upload->format('Y-m-d H:i:s')
    );
}

echo "\n=== End Check ===\n";