<?php

namespace App\Http\Controllers;

use App\Models\Carline;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Reader\Exception as ReaderException;

class CarlineController extends Controller
{
    public function index(Request $request)
    {
        $query = Carline::withCount('assy');

        if ($request->filled('search')) {
            $query->where('code', 'like', "%{$request->search}%");
        }

        $carlines = $query->orderBy('code')->paginate(15);

        return Inertia::render('Master/Carline/Index', [
            'carlines' => $carlines,
            'filters'  => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Master/Carline/Create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code'        => 'required|string|max:20|unique:carline,code',
            'description' => 'nullable|string|max:255',
        ]);

        Carline::create($validated);

        return redirect()->route('carline.index')
            ->with('success', 'Carline berhasil ditambahkan');
    }

    public function edit(Carline $carline)
    {
        return Inertia::render('Master/Carline/Edit', [
            'carline' => $carline,
        ]);
    }

    public function update(Request $request, Carline $carline)
    {
        $validated = $request->validate([
            'code'        => 'required|string|max:20|unique:carline,code,' . $carline->id,
            'description' => 'nullable|string|max:255',
        ]);

        $carline->update($validated);

        return redirect()->route('carline.index')
            ->with('success', 'Carline berhasil diubah');
    }

    public function destroy(Carline $carline)
    {
        if ($carline->assy()->count() > 0) {
            return redirect()->back()
                ->with('error', 'Carline tidak dapat dihapus karena masih memiliki Assy');
        }

        $carline->delete();

        return redirect()->route('carline.index')
            ->with('success', 'Carline berhasil dihapus');
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

            $headers = array_shift($data); // Remove header row

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
     * Import carlines from Excel file
     */
    public function import(Request $request)
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

            // Find the 'code' column index (case insensitive)
            $codeIndex = null;
            foreach ($headers as $index => $header) {
                if (strtolower(trim($header)) === 'code') {
                    $codeIndex = $index;
                    break;
                }
            }

            if ($codeIndex === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'File Excel harus memiliki kolom "code"'
                ], 400);
            }

            $imported = 0;
            $errors = [];
            $duplicates = [];

            foreach ($data as $rowIndex => $row) {
                $code = trim($row[$codeIndex] ?? '');

                if (empty($code)) {
                    $errors[] = "Baris " . ($rowIndex + 2) . ": Kode kosong";
                    continue;
                }

                // Check if code already exists in database
                $exists = Carline::where('code', $code)->exists();
                if ($exists) {
                    $duplicates[] = $code;
                    $errors[] = "Baris " . ($rowIndex + 2) . ": Kode '$code' sudah ada";
                    continue;
                }

                // Create new carline (without description since we only need code)
                try {
                    Carline::create([
                        'code' => $code,
                        'description' => null
                    ]);
                    $imported++;
                } catch (\Exception $e) {
                    $errors[] = "Baris " . ($rowIndex + 2) . ": Gagal menyimpan kode '$code' - " . $e->getMessage();
                }
            }

            $message = "Berhasil mengimport {$imported} carline";
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
                'errors' => $errors,
                'duplicates' => $duplicates
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengimport data: ' . $e->getMessage()
            ], 400);
        }
    }
    public function importPage()
    {
        return Inertia::render('Master/Carline/Import');
    }
}
