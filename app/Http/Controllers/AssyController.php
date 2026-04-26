<?php

namespace App\Http\Controllers;

use App\Models\Assy;
use App\Models\Carline;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\AssyMasterImport;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class AssyController extends Controller
{
    public function index(Request $request)
    {
        $query = Assy::with('carline');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('part_number', 'like', "%{$request->search}%")
                    ->orWhere('assy_code', 'like', "%{$request->search}%")
                    ->orWhere('level', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('carline_id')) {
            $query->where('carline_id', $request->carline_id);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->is_active === '1');
        }

        $assyMaster = $query->orderBy('part_number')->paginate(20);
        $carlines = Carline::orderBy('code')->get();

        return Inertia::render('Master/Assy/Index', [
            'assy'     => $assyMaster,
            'carlines' => $carlines,
            'filters'  => $request->only(['search', 'carline_id', 'is_active']),
        ]);
    }

    public function create()
    {
        $carlines = Carline::orderBy('code')->get();

        return Inertia::render('Master/Assy/Create', [
            'carlines' => $carlines,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'carline_id'  => 'required|exists:carline,id',
            'part_number' => 'required|string|max:50|unique:assy',
            'assy_code'   => 'required|string|max:20',
            'level'       => 'required|string|max:20',
            'type'        => 'nullable|string|max:10',
            'umh'         => 'required|numeric|min:0|max:9999.999999',
            'std_pack'    => 'required|integer|min:1',
            'is_active'   => 'boolean',
        ]);

        Assy::create($validated);

        return redirect()->route('assy.index')
            ->with('success', 'Assy berhasil ditambahkan');
    }

    public function edit(Assy $assy)
    {
        $carlines = Carline::orderBy('code')->get();

        return Inertia::render('Master/Assy/Edit', [
            'assy'     => $assy,
            'carlines' => $carlines,
        ]);
    }

    public function update(Request $request, Assy $assy)
    {
        $validated = $request->validate([
            'carline_id'  => 'required|exists:carline,id',
            'part_number' => ['required', 'string', 'max:50', Rule::unique('assy')->ignore($assy->id)],
            'assy_code'   => 'required|string|max:20',
            'level'       => 'required|string|max:20',
            'type'        => 'nullable|string|max:10',
            'umh'         => 'required|numeric|min:0|max:9999.999999',
            'std_pack'    => 'required|integer|min:1',
            'is_active'   => 'boolean',
        ]);

        $assy->update($validated);

        return redirect()->route('assy.index')
            ->with('success', 'Assy berhasil diubah');
    }

    public function destroy(Assy $assy)
    {
        if ($assy->srDetails()->exists() || $assy->spp()->exists()) {
            return back()->with('error', 'Assy tidak bisa dihapus karena sudah digunakan di SR atau SPP');
        }

        $assy->delete();

        return redirect()->route('assy.index')
            ->with('success', 'Assy berhasil dihapus');
    }

    public function show(Assy $assy)
    {
        $assy->load('carline');

        return Inertia::render('Master/Assy/Show', [
            'assy' => $assy,
        ]);
    }

    public function toggleStatus(Assy $assy)
    {
        $assy->update(['is_active' => !$assy->is_active]);

        return back()->with('success', 'Status assy berhasil diubah');
    }

    public function search(Request $request)
    {
        $search = $request->get('q');

        $assy = Assy::where('is_active', true)
            ->where(function ($query) use ($search) {
                $query->where('part_number', 'like', "%{$search}%")
                    ->orWhere('assy_code', 'like', "%{$search}%");
            })
            ->limit(20)
            ->get(['id', 'part_number', 'assy_code', 'level', 'umh']);

        return response()->json($assy);
    }

    /**
     * Upload Excel file dengan memilih Car Line terlebih dahulu
     */
    public function upload(Request $request)
    {
        $request->validate([
            'excel_file' => 'required|file|mimes:xlsx,xls,csv|max:5120', // Added csv support
            'carline_id' => 'required|exists:carline,id'
        ]);

        try {
            $import = new AssyMasterImport($request->carline_id);
            Excel::import($import, $request->file('excel_file'));

            $count = $import->getRowCount();
            $errors = $import->getErrors();
            
            if (!empty($errors)) {
                $errorMessage = "Upload selesai dengan " . count($errors) . " error:\n" . implode("\n", array_slice($errors, 0, 5));
                if (count($errors) > 5) {
                    $errorMessage .= "...\nDan " . (count($errors) - 5) . " error lainnya";
                }
                return redirect()->back()->with('warning', $errorMessage);
            }

            return redirect()->back()->with('success', "Berhasil upload {$count} data Assy untuk Car Line yang dipilih!");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal upload data: ' . $e->getMessage());
        }
    }

    /**
     * Download template Excel berdasarkan Car Line yang dipilih
     */
    public function downloadTemplate($carline_id)
    {
        try {
            $carline = Carline::findOrFail($carline_id);

            // Create Excel file
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Template Assy');

            // Title
            $sheet->setCellValue('A1', 'TEMPLATE IMPORT ASSY MASTER');
            $sheet->mergeCells('A1:G1');
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
            $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Car Line Info
            $sheet->setCellValue('A2', 'Car Line:');
            $sheet->setCellValue('B2', $carline->code . ' - ' . ($carline->description ?? $carline->name));
            $sheet->mergeCells('B2:G2');
            $sheet->getStyle('A2')->getFont()->setBold(true);
            $sheet->getStyle('A2')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E6F3FF');

            // Headers
            $headers = [
                'A' => 'part_number',
                'B' => 'assy_code',
                'C' => 'level',
                'D' => 'type',
                'E' => 'umh',
                'F' => 'std_pack'
            ];

            $headerRow = 4;
            foreach ($headers as $col => $header) {
                $sheet->setCellValue($col . $headerRow, strtoupper($header));
                $sheet->getColumnDimension($col)->setWidth(20);
            }

            // Style headers
            $headerStyle = [
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1D6F42'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'CCCCCC'],
                    ],
                ],
            ];
            $sheet->getStyle('A' . $headerRow . ':F' . $headerRow)->applyFromArray($headerStyle);

            // Sample data
            $samples = [
                [
                    'part_number' => 'ASSY001',
                    'assy_code' => 'AC-001',
                    'level' => '1',
                    'type' => 'STANDARD',
                    'umh' => 1.5,
                    'std_pack' => 10
                ],
                [
                    'part_number' => 'ASSY002',
                    'assy_code' => 'AC-002',
                    'level' => '2',
                    'type' => 'PREMIUM',
                    'umh' => 2.0,
                    'std_pack' => 20
                ],
                [
                    'part_number' => 'ASSY003',
                    'assy_code' => 'AC-003',
                    'level' => '1',
                    'type' => 'ECONOMY',
                    'umh' => 1.2,
                    'std_pack' => 15
                ],
            ];

            $startRow = 5;
            foreach ($samples as $index => $sample) {
                $currentRow = $startRow + $index;
                $sheet->setCellValue('A' . $currentRow, $sample['part_number']);
                $sheet->setCellValue('B' . $currentRow, $sample['assy_code']);
                $sheet->setCellValue('C' . $currentRow, $sample['level']);
                $sheet->setCellValue('D' . $currentRow, $sample['type']);
                $sheet->setCellValue('E' . $currentRow, $sample['umh']);
                $sheet->setCellValue('F' . $currentRow, $sample['std_pack']);
                
                // Style sample rows
                $sheet->getStyle('A' . $currentRow . ':F' . $currentRow)
                    ->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()
                    ->setRGB('F9F9F9');
            }

            // Add empty rows for user input
            for ($i = 0; $i < 10; $i++) {
                $row = $startRow + count($samples) + $i;
                $sheet->getStyle('A' . $row . ':F' . $row)
                    ->getBorders()
                    ->getAllBorders()
                    ->setBorderStyle(Border::BORDER_THIN)
                    ->setColor(['rgb' => 'CCCCCC']);
            }

            // Instructions sheet
            $infoSheet = $spreadsheet->createSheet();
            $infoSheet->setTitle('Petunjuk');
            
            $instructions = [
                ['PETUNJUK PENGISIAN TEMPLATE', ''],
                ['', ''],
                ['Informasi Car Line:', ''],
                ['Car Line ID:', $carline->id],
                ['Car Line Code:', $carline->code],
                ['Car Line Name:', $carline->description ?? $carline->name],
                ['', ''],
                ['Kolom yang wajib diisi:', ''],
                ['1. part_number', 'Nomor Part Assy (Unique, tidak boleh sama dalam 1 Car Line)'],
                ['2. assy_code', 'Kode Assy'],
                ['3. level', 'Level Assy (String)'],
                ['4. umh', 'Nilai UMH (Decimal, contoh: 1.5)'],
                ['5. std_pack', 'Standard Pack (Angka bulat)'],
                ['', ''],
                ['Kolom opsional:', ''],
                ['- type', 'Tipe Assy'],
                ['', ''],
                ['Format Data:', ''],
                ['- part_number: Maksimal 50 karakter', ''],
                ['- assy_code: Maksimal 20 karakter', ''],
                ['- level: Maksimal 20 karakter', ''],
                ['- type: Maksimal 10 karakter', ''],
                ['- umh: 0 - 9999.999999', ''],
                ['- std_pack: Minimal 1', ''],
                ['', ''],
                ['Catatan Penting:', ''],
                ['✓ Car Line sudah ditentukan, tidak perlu diisi', ''],
                ['✓ part_number harus unique dalam 1 Car Line', ''],
                ['✓ File maksimal 1000 baris data', ''],
                ['✓ Format file: .xlsx, .xls, atau .csv', ''],
                ['✓ Baris pertama (header) tidak akan diimport', ''],
                ['✓ Data contoh bisa dihapus atau diganti dengan data asli', ''],
            ];

            $row = 1;
            foreach ($instructions as $instruction) {
                $infoSheet->setCellValue('A' . $row, $instruction[0]);
                if (isset($instruction[1]) && $instruction[1]) {
                    $infoSheet->setCellValue('B' . $row, $instruction[1]);
                }
                $row++;
            }
            
            $infoSheet->getColumnDimension('A')->setWidth(30);
            $infoSheet->getColumnDimension('B')->setWidth(50);
            
            // Style info sheet
            $infoSheet->getStyle('A1')->getFont()->setBold(true)->setSize(12);
            $infoSheet->getStyle('A1')->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setRGB('1D6F42');
            $infoSheet->getStyle('A1')->getFont()->getColor()->setRGB('FFFFFF');

            // Set active sheet to first sheet
            $spreadsheet->setActiveSheetIndex(0);

            // Download file
            $filename = 'template_assy_' . $carline->code . '_' . date('Ymd') . '.xlsx';
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Cache-Control: max-age=0');
            
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            exit();
            
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal generate template: ' . $e->getMessage());
        }
    }

    /**
     * Show import page
     */
    public function importPage()
    {
        $carlines = Carline::orderBy('code')->get();
        return Inertia::render('Master/Assy/Import', [
            'carlines' => $carlines,
        ]);
    }

    /**
     * Get all sheet names from Excel file
     */
    public function getSheets(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls,csv'
            ]);

            $file = $request->file('file');
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheets = $spreadsheet->getSheetNames();
            
            return response()->json([
                'success' => true,
                'sheets' => $sheets
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membaca file Excel: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Preview first 10 rows of selected sheet
     */
    public function previewSheet(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls,csv',
                'sheet' => 'required|string'
            ]);

            $file = $request->file('file');
            $sheetName = $request->sheet;
            
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getSheetByName($sheetName);
            
            if (!$sheet) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sheet tidak ditemukan'
                ], 400);
            }
            
            $data = $sheet->toArray();
            
            if (empty($data)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sheet kosong'
                ], 400);
            }
            
            $headers = array_shift($data);
            
            // Return first 10 rows for preview
            $preview = array_slice($data, 0, 10);
            $previewWithHeaders = [];
            
            foreach ($preview as $rowIndex => $row) {
                $rowData = [];
                foreach ($headers as $index => $header) {
                    $rowData[trim($header)] = $row[$index] ?? '';
                }
                $previewWithHeaders[] = $rowData;
            }
            
            return response()->json([
                'success' => true,
                'data' => $previewWithHeaders
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal preview sheet: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Import assy from Excel file
     */
    public function import(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:xlsx,xls,csv',
                'sheet' => 'required|string',
                'carline_id' => 'required|exists:carline,id'
            ]);
            
            $file = $request->file('file');
            $sheetName = $request->sheet;
            $carlineId = $request->carline_id;
            
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getSheetByName($sheetName);
            
            if (!$sheet) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sheet tidak ditemukan'
                ], 400);
            }
            
            $data = $sheet->toArray();
            
            if (empty($data)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sheet kosong'
                ], 400);
            }
            
            $headers = array_shift($data);
            
            // Find required column indices
            $partNumberIndex = null;
            $assyCodeIndex = null;
            $levelIndex = null;
            $umhIndex = null;
            $stdPackIndex = null;
            $typeIndex = null;
            
            foreach ($headers as $index => $header) {
                $headerLower = strtolower(trim($header));
                if ($headerLower === 'part_number') $partNumberIndex = $index;
                if ($headerLower === 'assy_code') $assyCodeIndex = $index;
                if ($headerLower === 'level') $levelIndex = $index;
                if ($headerLower === 'umh') $umhIndex = $index;
                if ($headerLower === 'std_pack') $stdPackIndex = $index;
                if ($headerLower === 'type') $typeIndex = $index;
            }
            
            // Validate required columns
            $missingColumns = [];
            if ($partNumberIndex === null) $missingColumns[] = 'part_number';
            if ($assyCodeIndex === null) $missingColumns[] = 'assy_code';
            if ($levelIndex === null) $missingColumns[] = 'level';
            if ($umhIndex === null) $missingColumns[] = 'umh';
            if ($stdPackIndex === null) $missingColumns[] = 'std_pack';
            
            if (!empty($missingColumns)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File Excel harus memiliki kolom: ' . implode(', ', $missingColumns)
                ], 400);
            }
            
            $imported = 0;
            $errors = [];
            
            foreach ($data as $rowIndex => $row) {
                $partNumber = trim($row[$partNumberIndex] ?? '');
                $assyCode = trim($row[$assyCodeIndex] ?? '');
                $level = trim($row[$levelIndex] ?? '');
                $umh = $row[$umhIndex] ?? '';
                $stdPack = $row[$stdPackIndex] ?? '';
                $type = $typeIndex !== null ? trim($row[$typeIndex] ?? '') : null;
                
                if (empty($partNumber)) {
                    $errors[] = "Baris " . ($rowIndex + 2) . ": Part number kosong";
                    continue;
                }
                
                if (empty($assyCode) || empty($level) || empty($umh) || empty($stdPack)) {
                    $errors[] = "Baris " . ($rowIndex + 2) . ": Field wajib tidak lengkap (assy_code, level, umh, std_pack)";
                    continue;
                }
                
                // Check if part number already exists in this carline
                $exists = Assy::where('carline_id', $carlineId)
                    ->where('part_number', $partNumber)
                    ->exists();
                    
                if ($exists) {
                    $errors[] = "Baris " . ($rowIndex + 2) . ": Part number '$partNumber' sudah ada untuk Car Line ini";
                    continue;
                }
                
                try {
                    Assy::create([
                        'carline_id' => $carlineId,
                        'part_number' => $partNumber,
                        'assy_code' => $assyCode,
                        'level' => $level,
                        'type' => $type,
                        'umh' => floatval($umh),
                        'std_pack' => intval($stdPack),
                        'is_active' => true
                    ]);
                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = "Baris " . ($rowIndex + 2) . ": Gagal menyimpan - " . $e->getMessage();
                }
            }
            
            $message = "Berhasil mengimport {$imported} assy";
            if ($imported === 0) {
                $message = "Tidak ada data yang berhasil diimport";
            }
            
            if (!empty($errors)) {
                $errorList = array_slice($errors, 0, 5);
                $message .= ". Error: " . implode(", ", $errorList);
                if (count($errors) > 5) {
                    $message .= " dan " . (count($errors) - 5) . " error lainnya";
                }
            }
            
            $success = $imported > 0;
            
            return response()->json([
                'success' => $success,
                'message' => $message,
                'imported' => $imported,
                'errors' => $errors
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengimport data: ' . $e->getMessage()
            ], 400);
        }
    }
}