<?php

namespace App\Http\Controllers;

use App\Models\ProductionWeek;
use App\Models\Customer;
use App\Services\WeekGenerator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductionWeekController extends Controller
{
    /**
     * Tampilkan list production weeks
     */
    public function index(Request $request)
    {
        $query = ProductionWeek::with('customer');

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('year')) {
            $query->where('year', $request->year);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('month_name', 'like', "%{$search}%")
                    ->orWhere('year', 'like', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%")
                            ->orWhere('code', 'like', "%{$search}%");
                    });
            });
        }

        $productionWeeks = $query->orderBy('year', 'desc')
            ->orderBy('month_number', 'asc')
            ->orderBy('week_no', 'asc')
            ->paginate(15)
            ->withQueryString();

        $availableYears = ProductionWeek::select('year')->distinct()->orderBy('year', 'desc')->pluck('year');
        $customers = Customer::orderBy('name')->get();

        // Statistik untuk summary cards
        $editedCount = ProductionWeek::whereHas('etdMappings', function ($q) {
            $q->where('is_edited', true);
        })->count();

        return Inertia::render('Master/ProductionWeek/Index', [
            'productionWeeks' => $productionWeeks,
            'customers' => $customers,
            'availableYears' => $availableYears,
            'filters' => $request->only(['customer_id', 'year', 'search']),
            'stats' => [
                'total' => $productionWeeks->total(),
                'edited_count' => $editedCount,
            ],
            'flash' => session('flash') ?: (session('success') ? ['success' => session('success')] : null),
        ]);
    }

    /**
     * Form create production week
     */
    public function create()
    {
        $customers = Customer::orderBy('name')->get();

        return Inertia::render('Master/ProductionWeek/Create', [
            'customers' => $customers,
        ]);
    }

    /**
     * Simpan production week baru
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'year' => 'required|integer|min:2020|max:2030',
            'month_number' => 'required|integer|min:1|max:12',
            'month_name' => 'required|string|max:3',
            'week_no' => 'required|integer|min:1|max:53',
            'week_start' => 'required|date',
            'num_weeks' => 'required|integer|min:1|max:6',
        ]);

        $exists = ProductionWeek::where('customer_id', $validated['customer_id'])
            ->where('year', $validated['year'])
            ->where('month_number', $validated['month_number'])
            ->where('week_no', $validated['week_no'])
            ->exists();

        if ($exists) {
            return redirect()->back()
                ->with('error', 'Production week already exists!')
                ->withInput();
        }

        ProductionWeek::create($validated);

        return redirect()->route('production-week.index')
            ->with('success', 'Production Week successfully added!');
    }

    /**
     * Form edit production week
     */
    public function edit(ProductionWeek $productionWeek)
    {
        $customers = Customer::orderBy('name')->get();

        return Inertia::render('Master/ProductionWeek/Edit', [
            'productionWeek' => $productionWeek,
            'customers' => $customers,
        ]);
    }

    /**
     * Update production week
     */
    public function update(Request $request, ProductionWeek $productionWeek)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'year' => 'required|integer|min:2020|max:2030',
            'month_number' => 'required|integer|min:1|max:12',
            'month_name' => 'required|string|max:3',
            'week_no' => 'required|integer|min:1|max:53',
            'week_start' => 'required|date',
            'num_weeks' => 'required|integer|min:1|max:6',
        ]);

        $exists = ProductionWeek::where('customer_id', $validated['customer_id'])
            ->where('year', $validated['year'])
            ->where('month_number', $validated['month_number'])
            ->where('week_no', $validated['week_no'])
            ->where('id', '!=', $productionWeek->id)
            ->exists();

        if ($exists) {
            return redirect()->back()
                ->with('error', 'Production week already exists!')
                ->withInput();
        }

        $productionWeek->update($validated);

        return redirect()->route('production-week.index')
            ->with('success', 'Production Week successfully updated!');
    }

    /**
     * Hapus production week
     */
    public function destroy(ProductionWeek $productionWeek)
    {
        // Cek apakah week ini dipakai di etd_mappings
        $mappingCount = $productionWeek->etdMappings()->count();

        if ($mappingCount > 0) {
            return redirect()->back()
                ->with('error', 'Week tidak bisa dihapus karena masih dipakai di ETD Mapping');
        }

        $productionWeek->delete();

        return redirect()->route('production-week.index')
            ->with('success', 'Production Week successfully deleted!');
    }

    /**
     * Regenerate weeks dari data SR yang ada
     */
    public function regenerate(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
        ]);

        $customerId = $request->customer_id;
        $customerCode = Customer::find($customerId)->code;

        // Ambil semua ETD dari tabel srs untuk customer ini
        $etdDates = \App\Models\SR::where('customer', $customerCode)
            ->whereNotNull('etd')
            ->distinct()
            ->pluck('etd')
            ->toArray();

        if (empty($etdDates)) {
            return redirect()->back()
                ->with('warning', 'Tidak ada data ETD untuk customer ini. Upload SR dulu.');
        }

        $minEtd = min($etdDates);
        $maxEtd = max($etdDates);

        DB::beginTransaction();

        try {
            // Hapus weeks lama untuk customer ini
            ProductionWeek::where('customer_id', $customerId)->delete();

            // Generate weeks baru
            $weeks = WeekGenerator::generateFromDateRange($customerId, $minEtd, $maxEtd);

            DB::commit();

            return redirect()->route('production-week.index')
                ->with('success', "Berhasil regenerate {$weeks->count()} weeks untuk customer ini.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Regenerate weeks error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Gagal regenerate: ' . $e->getMessage());
        }
    }

    // ===================== IMPORT EXCEL =====================

    /**
     * Import production weeks dari Excel
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls',
            'customer_id' => 'required|exists:customers,id',
        ]);

        try {
            $file = $request->file('file');
            $customerId = $request->customer_id;

            $spreadsheet = IOFactory::load($file->getPathname());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Hapus header row
            array_shift($rows);

            $successCount = 0;
            $errorCount = 0;
            $errors = [];

            $monthMap = [
                'JAN' => 1,
                'FEB' => 2,
                'MAR' => 3,
                'APR' => 4,
                'MAY' => 5,
                'JUN' => 6,
                'JUL' => 7,
                'AUG' => 8,
                'SEP' => 9,
                'OCT' => 10,
                'NOV' => 11,
                'DEC' => 12
            ];

            foreach ($rows as $rowIndex => $row) {
                if (empty(array_filter($row))) continue;

                try {
                    $monthName = trim(strtoupper($row[0] ?? ''));
                    $rangeText = trim($row[1] ?? '');
                    $year = trim($row[2] ?? '');
                    $weekNo = trim($row[3] ?? '');

                    if (empty($monthName) || empty($rangeText) || empty($year) || empty($weekNo)) {
                        $errorCount++;
                        $errors[] = "Row " . ($rowIndex + 2) . ": Missing required data";
                        continue;
                    }

                    $monthNumber = $monthMap[$monthName] ?? null;
                    if (!$monthNumber) {
                        $errorCount++;
                        $errors[] = "Row " . ($rowIndex + 2) . ": Invalid month '{$monthName}'";
                        continue;
                    }

                    // Parse range untuk mendapatkan start date
                    preg_match('/(\d+)\/([A-Z]+)/', $rangeText, $matches);
                    if (empty($matches)) {
                        $errorCount++;
                        $errors[] = "Row " . ($rowIndex + 2) . ": Invalid range format '{$rangeText}'";
                        continue;
                    }

                    $startDay = $matches[1];
                    $startMonth = $monthMap[$matches[2]] ?? null;

                    if (!$startMonth) {
                        $errorCount++;
                        $errors[] = "Row " . ($rowIndex + 2) . ": Invalid month in range";
                        continue;
                    }

                    $startDate = date('Y-m-d', strtotime("{$year}-{$startMonth}-{$startDay}"));

                    // Extract jumlah minggu dari range
                    preg_match('/~.*\((\d+)\)/', $rangeText, $weekMatches);
                    $numWeeks = !empty($weekMatches) ? (int)$weekMatches[1] : (int)$weekNo;

                    $exists = ProductionWeek::where('customer_id', $customerId)
                        ->where('year', $year)
                        ->where('month_number', $monthNumber)
                        ->where('week_no', $weekNo)
                        ->exists();

                    if ($exists) {
                        $errorCount++;
                        $errors[] = "Row " . ($rowIndex + 2) . ": Duplicate entry for {$monthName} {$year} Week {$weekNo}";
                        continue;
                    }

                    ProductionWeek::create([
                        'customer_id' => $customerId,
                        'year' => $year,
                        'month_number' => $monthNumber,
                        'month_name' => $monthName,
                        'week_no' => $weekNo,
                        'week_start' => $startDate,
                        'num_weeks' => $numWeeks,
                    ]);

                    $successCount++;
                } catch (\Exception $e) {
                    $errorCount++;
                    $errors[] = "Row " . ($rowIndex + 2) . ": " . $e->getMessage();
                }
            }

            $message = "Import completed: {$successCount} records imported successfully.";
            if ($errorCount > 0) {
                $message .= " {$errorCount} records failed.";
                return redirect()->route('production-week.index')
                    ->with('warning', $message)
                    ->with('import_errors', array_slice($errors, 0, 10));
            }

            return redirect()->route('production-week.index')
                ->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Failed to import file: ' . $e->getMessage());
        }
    }

    /**
     * Download template Excel
     */
    public function downloadTemplate()
    {
        $templatePath = storage_path('app/templates/production-week-template.xlsx');

        if (!file_exists(storage_path('app/templates'))) {
            mkdir(storage_path('app/templates'), 0777, true);
        }

        if (!file_exists($templatePath)) {
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            $sheet->setCellValue('A1', 'Bulan');
            $sheet->setCellValue('B1', 'Range (Start ~ End (Total Weeks))');
            $sheet->setCellValue('C1', 'Tahun');
            $sheet->setCellValue('D1', 'Minggu Ke-');

            $sheet->setCellValue('A2', 'JAN');
            $sheet->setCellValue('B2', '05/JAN ~ 30/JAN (4)');
            $sheet->setCellValue('C2', '2026');
            $sheet->setCellValue('D2', '4');

            $sheet->setCellValue('A3', 'FEB');
            $sheet->setCellValue('B3', '02/FEB ~ 27/FEB (4)');
            $sheet->setCellValue('C3', '2026');
            $sheet->setCellValue('D3', '5');

            $sheet->setCellValue('A4', 'MAR');
            $sheet->setCellValue('B4', '02/MAR ~ 31/MAR (4)');
            $sheet->setCellValue('C4', '2026');
            $sheet->setCellValue('D4', '4');

            $headerStyle = [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'E0E0E0']
                ]
            ];
            $sheet->getStyle('A1:D1')->applyFromArray($headerStyle);

            foreach (range('A', 'D') as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save($templatePath);
        }

        return response()->download($templatePath, 'production-week-template.xlsx');
    }
}
