<?php
require __DIR__ . '/vendor/autoload.php';
use Carbon\Carbon;

function calculateWeek(Carbon $date): int
{
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

    return intdiv($first->diffInDays($weekMonday, false), 7) + 1;
}

$start = new Carbon('2026-01-01');
$end = new Carbon('2027-01-15');
$date = $start->copy();
while ($date->lte($end)) {
    if ($date->dayOfWeek === Carbon::MONDAY) {
        echo $date->format('Y-m-d').' | week '.calculateWeek($date).' | remaining '.$date->daysInMonth - $date->day + 1 ."\n";
    }
    $date->addDay();
}
