<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "CarLines:\n";
$carlines = \App\Models\CarLine::all();
foreach ($carlines as $cl) {
    echo "  {$cl->id}: {$cl->code} - {$cl->description}\n";
}

echo "\nAssy count: " . \App\Models\Assy::count() . "\n";

echo "\nSR count: " . \App\Models\SR::count() . "\n";

echo "\nTest complete.\n";