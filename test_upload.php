<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing SR Upload with CarLine & Auto-Assy Creation\n\n";

// Test 1: Check if CarLine selection works
$carlines = \App\Models\CarLine::all();
echo "Available CarLines: " . $carlines->count() . "\n";
foreach ($carlines as $cl) {
    echo "  - {$cl->code} ({$cl->id})\n";
}

// Test 2: Simulate auto-creation of Assy
$testPartNumber = 'TEST-PART-001';
echo "\nTesting auto-creation of Assy for part: {$testPartNumber}\n";

$existingAssy = \App\Models\Assy::where('part_number', $testPartNumber)->first();
if (!$existingAssy) {
    echo "Part not found, creating...\n";
    $newAssy = \App\Models\Assy::create([
        'carline_id'  => 1, // J72A
        'part_number' => $testPartNumber,
        'assy_code'   => null,
        'level'       => null,
        'type'        => null,
        'umh'         => 0,
        'std_pack'    => 0,
        'is_active'   => true,
    ]);
    echo "Created Assy with ID: {$newAssy->id}\n";
} else {
    echo "Part already exists with ID: {$existingAssy->id}\n";
}

// Test 3: Check SR model has new fields
$sr = new \App\Models\SR();
$fillable = $sr->getFillable();
echo "\nSR fillable fields include carline_id: " . (in_array('carline_id', $fillable) ? 'YES' : 'NO') . "\n";
echo "SR fillable fields include assy_id: " . (in_array('assy_id', $fillable) ? 'YES' : 'NO') . "\n";
echo "SR fillable fields include is_mapped: " . (in_array('is_mapped', $fillable) ? 'YES' : 'NO') . "\n";

echo "\nTest complete!\n";