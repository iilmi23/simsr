<?php
/**
 * Test YNA Week Calculation - CORRECTED ALGORITHM
 * Verifying that week calculation works correctly
 */

require_once __DIR__ . '/vendor/autoload.php';
use Carbon\Carbon;

echo "=== YNA Week Calculation Test - CORRECTED ALGORITHM ===\n\n";

// Test weeks based on user requirements:
// - April W1 starts from 30 Mar (Monday closest to April 1)
// - Feb W1 starts from 2 Feb (Monday closest to Feb 1)
// Using ETD dates for week calculation

$testDates = [
    '2026-02-02' => 1,  // Feb 1 is Sunday → Monday after (Feb 2) = W1 Feb
    '2026-03-30' => 1,  // Apr 1 is Wednesday → Monday before (Mar 30) = W1 Apr
    '2026-04-01' => 1,  // Same week as Mar 30 → W1 Apr
    '2026-04-05' => 1,  // Same week as Mar 30 → W1 Apr
    '2026-04-06' => 2,  // Apr 6 Monday → W2 Apr
    '2026-04-13' => 3,  // Apr 13 Monday → W3 Apr
    '2026-04-20' => 4,  // Apr 20 Monday → W4 Apr
    '2026-04-27' => 5,  // Apr 27 Monday → W5 Apr
];

$calculator = new class {
    /**
     * Calculate YNA week number for a given date.
     *
     * YNA orders run weekly Monday-Friday (or Thursday-Friday).
     * Week 1 of a month is the week containing the 1st of the month,
     * starting from the Monday closest to that date (before or after).
     *
     * Algorithm:
     * 1. For the month of the date, find the Monday closest to the 1st of that month
     * 2. That Monday becomes the start of Week 1 for that month
     * 3. Count weeks from that Monday
     *
     * Examples:
     * - April 1 is Wednesday → Monday before (March 30) = Week 1 start for April
     * - Feb 1 is Sunday → Monday after (Feb 2) = Week 1 start for Feb
     *
     * @param int|string $timestamp
     * @return int Week number (1-5)
     */
    private function calculateYNAWeek($timestamp): int
    {
        $date = new Carbon('@' . (int)$timestamp);
        $month = $date->month;
        $year = $date->year;

        // Find the Monday closest to the 1st of the month
        $firstOfMonth = Carbon::create($year, $month, 1);
        $firstMonday = $firstOfMonth->copy();

        if ($firstOfMonth->dayOfWeek == 1) { // Already Monday
            // Do nothing, firstMonday is already set
        } elseif ($firstOfMonth->dayOfWeek == 0) { // Sunday
            $firstMonday->addDay(); // Next Monday
        } else { // Tuesday-Saturday
            $firstMonday->startOfWeek(Carbon::MONDAY); // Previous Monday
        }

        // Now calculate which week this date falls into
        // Count complete 7-day cycles from firstMonday
        $daysFromFirstMonday = $firstMonday->diffInDays($date, false);
        $weekNumber = intdiv($daysFromFirstMonday, 7) + 1;

        // Cap at 5 weeks per month
        return min($weekNumber, 5);
    }

    public function test($dateStr, $expectedWeek)
    {
        $timestamp = strtotime($dateStr);
        $date = new Carbon($dateStr);
        $week = $this->calculateYNAWeek($timestamp);

        $status = ($week === $expectedWeek) ? '✓ PASS' : '✗ FAIL';
        $dayName = $date->format('l'); // Monday, Tuesday, etc.

        echo "$status | {$dateStr} ({$dayName}): Expected W{$expectedWeek}, Got W{$week}\n";

        return $week === $expectedWeek;
    }
};

$passed = 0;
$total = 0;

foreach ($testDates as $dateStr => $expectedWeek) {
    $total++;
    if ($calculator->test($dateStr, $expectedWeek)) {
        $passed++;
    }
}

echo "\n=== Result: $passed / $total tests passed ===\n";

if ($passed === $total) {
    echo "✓ All tests passed! Week calculation is correct.\n";
    exit(0);
} else {
    echo "✗ Some tests failed. Please review.\n";
    exit(1);
}
