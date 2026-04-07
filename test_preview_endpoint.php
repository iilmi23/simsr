<?php

// Test script untuk endpoint SR preview dengan file SAI
// Jalankan dengan: php test_preview_endpoint.php

require 'vendor/autoload.php';

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use App\Models\Customer;
use App\Http\Controllers\SRController;

// Setup Laravel
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🧪 Testing SR Preview Endpoint with SAI file\n\n";

try {
    // Setup test data
    $filePath = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';

    if (!file_exists($filePath)) {
        echo "❌ Test file tidak ditemukan: $filePath\n";
        exit(1);
    }

    // Create UploadedFile mock dengan cara yang benar
    $filePath = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';
    $tempFile = tmpfile();
    $tempPath = stream_get_meta_data($tempFile)['uri'];
    copy($filePath, $tempPath);

    $uploadedFile = new UploadedFile(
        $tempPath,
        '2. PO JL60421-22 (APRIL-W2)SAI-T.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filesize($tempPath),
        UPLOAD_ERR_OK,
        true
    );

    // Create request
    $request = new Request();
    $request->files->set('file', $uploadedFile);
    $request->merge([
        'sheet' => 1,  // Sheet index 1 (List Order)
        'customer' => 5,  // SAI customer ID
    ]);

    // Get customer
    $customer = Customer::find(5);
    if (!$customer) {
        echo "❌ Customer ID 5 tidak ditemukan\n";
        exit(1);
    }

    echo "📋 Test Parameters:\n";
    echo "  File: " . $uploadedFile->getClientOriginalName() . "\n";
    echo "  Sheet: 1 (List Order)\n";
    echo "  Customer: {$customer->name} ({$customer->code})\n\n";

    // Test controller
    $controller = new SRController();

    echo "⏳ Calling preview endpoint...\n";
    $startTime = microtime(true);

    $response = $controller->preview($request);

    $endTime = microtime(true);
    $duration = number_format($endTime - $startTime, 2);

    echo "✅ Preview completed in {$duration} seconds\n\n";

    // Check response
    $responseData = json_decode($response->getContent(), true);

    if ($responseData['success'] ?? false) {
        echo "📊 Preview Results:\n";
        $data = $responseData['data'];
        echo "  Total records: " . ($data['total_records'] ?? 0) . "\n";
        echo "  Unique parts: " . ($data['unique_parts'] ?? 0) . "\n";
        echo "  FIRM count: " . ($data['firm_count'] ?? 0) . "\n";
        echo "  FORECAST count: " . ($data['forecast_count'] ?? 0) . "\n";
        echo "  Total FIRM qty: " . number_format($data['total_firm_qty'] ?? 0) . "\n";
        echo "  Total FORECAST qty: " . number_format($data['total_forecast_qty'] ?? 0) . "\n";
        echo "  Months covered: " . implode(', ', $data['months_covered'] ?? []) . "\n";

        if (!empty($data['preview'])) {
            echo "\n📋 Sample record:\n";
            $sample = $data['preview'][0] ?? null;
            if ($sample) {
                echo "  Part: {$sample['part_number']}\n";
                echo "  Qty: {$sample['qty']}\n";
                echo "  Type: {$sample['order_type']}\n";
                echo "  ETA: {$sample['eta']}\n";
                echo "  ETD: {$sample['etd']}\n";
            }
        }

        echo "\n🎉 Preview test PASSED! Memory-efficient Excel reading works!\n";
    } else {
        echo "❌ Preview failed: " . ($responseData['error'] ?? 'Unknown error') . "\n";
        exit(1);
    }

} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
