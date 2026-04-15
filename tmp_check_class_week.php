<?php
require __DIR__ . '/vendor/autoload.php';
use App\Exports\YNAExport;

$obj = new YNAExport([]);
$closure = Closure::bind(function ($timestamp) {
    return $this->calculateYNAWeek($timestamp);
}, $obj, get_class($obj));

$dates = ['2026-03-30','2026-04-01','2026-05-04','2026-08-03','2026-10-05','2027-01-04'];
foreach ($dates as $date) {
    echo $date . ' => ' . $closure(strtotime($date)) . "\n";
}
