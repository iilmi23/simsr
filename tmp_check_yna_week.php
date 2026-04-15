<?php
require __DIR__ . '/vendor/autoload.php';
use Carbon\Carbon;

function f($timestamp) {
    $date = new Carbon('@' . (int)$timestamp);
    $weekMonday = $date->copy()->startOfWeek(Carbon::MONDAY);
    $remaining = $weekMonday->daysInMonth - $weekMonday->day + 1;
    $target = $weekMonday->copy();
    if ($remaining < 3) {
        $target->addMonthNoOverflow();
    }
    $first = Carbon::create($target->year, $target->month, 1);
    if ($first->dayOfWeek === Carbon::SUNDAY) {
        $first = $first->copy()->addDay();
    } else {
        $first = $first->copy()->startOfWeek(Carbon::MONDAY);
    }
    return [
        $date->toDateString(),
        $weekMonday->toDateString(),
        $weekMonday->month,
        $remaining,
        $target->format('Y-m'),
        intdiv($first->diffInDays($weekMonday, false), 7) + 1,
    ];
}
$cases = ['2026-03-30','2026-04-01','2026-04-05','2026-09-28','2026-11-30','2026-12-28','2026-12-29'];
foreach ($cases as $d) {
    $r = f(strtotime($d));
    echo implode(' | ', $r) . "\n";
}
