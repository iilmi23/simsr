<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\SR;

echo "Testing SR insert with year column...\n";

try {
    $testData = [
        'customer' => 'YC',
        'part_number' => 'TEST123',
        'qty' => 100,
        'etd' => '2026-04-01',
        'eta' => '2026-04-01',
        'week' => '1',
        'month' => 'APR',
        'year' => 2026,
        'order_type' => 'FIRM',
        'source_file' => 'test.xlsx',
        'upload_batch' => 'test-batch-' . time(),
        'created_at' => now(),
        'updated_at' => now(),
    ];

    $sr = SR::create($testData);
    echo "✅ SR record created successfully! ID: {$sr->id}\n";

    // Check total records
    $total = SR::count();
    echo "Total SR records: $total\n";

    // Check summary query
    $summary = SR::query()
        ->selectRaw('customer, source_file, COUNT(*) as records, SUM(qty) as total_qty')
        ->groupBy('customer', 'source_file')
        ->get();

    echo "\nSummary:\n";
    foreach($summary as $item) {
        echo "  - {$item->customer}: {$item->source_file} ({$item->records} records, qty: {$item->total_qty})\n";
    }

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}