<?php
/**
 * Test YNA Week Calculation
 * Verifying that week calculation works correctly for April 2026
 */

// Load composer autoloader
require_once __DIR__ . '/vendor/autoload.php';
use Carbon\Carbon;

echo "=== YNA Week Calculation Test for April 2026 ===\n\n";

// Test weeks for April 2026
// Important: Each date's week is calculated based on its OWN month
// For April dates: First Monday on/before Apr 1 = March 30
// Apr 6 = 7 days after Mar 30 = Week 2
// Apr 1-5 dates = Week 1 (covers Mar 30 - Apr 5)
// For March dates: First Monday on/before Mar 1 = Feb 23
// Mar 30 = Week 5 of March (Feb 23 + 28 days)
// For May dates: First Monday on/before May 1 = April 27
// May 4 = 7 days after Apr 27 = Week 2

$testDates = [
    '2026-03-30' => 5,  // Week 5 of MARCH (not April) - because it's in March month
    '2026-04-01' => 1,  // Wed in first week of APRIL
    '2026-04-05' => 1,  // Sun in first week of APRIL
    '2026-04-06' => 2,  // Monday of week 2 for APRIL
    '2026-04-13' => 3,  // Monday of week 3 for APRIL  
    '2026-04-20' => 4,  // Monday of week 4 for APRIL
    '2026-04-27' => 5,  // Monday of week 5 for APRIL
    '2026-05-04' => 2,  // Week 2 of MAY (7 days after Apr 27 which is first Monday of May)
];

$calculator = new class {
    /**
     * Calculate YNA week number for a given date.
     * 
     * YNA orders run weekly Monday-Friday (or Thursday-Friday).
     * For any given month, we find the Monday-based weeks that include dates in that month.
     * 
     * Algorithm:
     * 1. Find which month the date belongs to
     * 2. Find the first Monday that is <= first day of that month
     * 3. Calculate which "week" the date falls into, counting from that first Monday
     * 
     * @param int|string $timestamp
     * @return int Week number (1-5)
     */
    private function calculateYNAWeek($timestamp): int
    {
        $date = new Carbon('@' . (int)$timestamp);
        $dateMonth = $date->copy()->startOfMonth();
        
        // Find first Monday of or before the first day of the month that date belongs to
        $firstMonday = $dateMonth->copy();
        while ($firstMonday->dayOfWeek != 1) { // 1 = Monday
            $firstMonday->subDay();
        }
        
        // Calculate how many complete 7-day cycles have passed since first Monday
        $daysSinceFirstMonday = $firstMonday->diffInDays($date, false);
        $weekNumber = intdiv($daysSinceFirstMonday, 7) + 1;
        
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
