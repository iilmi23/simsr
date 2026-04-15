<?php
/**
 * Test untuk menganalisis issue ETD/ETA tidak terekstrak semua
 * 
 * Kemungkinan penyebab:
 * 1. Kolom ETD/ETA tanpa quantity (qty=0 atau kosong) dilewati
 * 2. Validasi label ETD Date / ETA Date / Net tidak cocok
 * 3. Kolom data dimulai dari index 9 (kolom J) tapi ada yang dari index lain
 */

require 'vendor/autoload.php';

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

// Simulasi data struktur YNA dengan berbagai skenario ETD/ETA
$testData = [
    // Row 0 (PSA block anchor)
    [0 => 'Header', 5 => 'PSA#', 8 => 'Part 001'],
    // Row 1 (YNA Part Description)
    [7 => 'YNA Part Description', 8 => 'JAI-001', 9 => 'Desc1..'],
    // Row 2 (Customer Part)
    [null],
    // Row 3 (ETD Date)
    [8 => 'ETD Date', 9 => '2026-03-15', 10 => '2026-03-22', 11 => '2026-03-29', 12 => '2026-04-05', 13 => '2026-04-12'],
    // Row 4 (ETA Date)
    [8 => 'ETA Date', 9 => '2026-04-15', 10 => '2026-04-22', 11 => '', 12 => '2026-05-05', 13 => ''],
    // Row 5 (Net/Qty)
    [8 => 'Net', 9 => 100, 10 => 0, 11 => 50, 12 => '', 13 => 75],
];

echo "=== TEST: Analisis Kondisi ETD/ETA Dilewatkan ===\n\n";

echo "Struktur Data:\n";
echo "  [Col J] (idx 9):  ETD=2026-03-15, ETA=2026-04-15, QTY=100  (VALID)\n";
echo "  [Col K] (idx 10): ETD=2026-03-22, ETA=2026-04-22, QTY=0    (SKIPPED: qty=0)\n";
echo "  [Col L] (idx 11): ETD=2026-03-29, ETA=kosong,   QTY=50  (SKIP jika ETA validation)\n";
echo "  [Col M] (idx 12): ETD=2026-04-05, ETA=2026-05-05, QTY=kosong (SKIPPED: qty=null)\n";
echo "  [Col N] (idx 13): ETD=2026-04-12, ETA=kosong,   QTY=75  (FALLBACK ETA)\n\n";

// Analisis kondisi dalam parseBlock
echo "=== KONDISI SKIP DALAM CODE ===\n\n";
echo "1. QTY Check (line 238-239):\n";
echo "   if (\$qty === null || \$qty <= 0) continue;\n";
echo "   → Kolom 10,12 akan DILEWATKAN karena qty=0 atau null\n";
echo "   → ETD/ETA di kolom tersebut tidak akan masuk hasil export\n\n";

echo "2. ETD Check (line 244-245):\n";
echo "   if (\$etd === null) continue;\n";
echo "   → Kolom dengan ETD kosong/invalid akan DILEWATKAN\n\n";

echo "3. ETA Label Check (line 249):\n";
echo "   \$etaRaw = (\$etaLabel === 'ETA Date') ? ... : null;\n";
echo "   → Jika label ETA tidak cocok, semua ETA menjadi fallback\n\n";

echo "=== KESIMPULAN ===\n";
echo "Masalah: Mapper HANYA mengambil kolom yang memiliki:\n";
echo "  1. QTY > 0 (quantity harus ada dan positif)\n";
echo "  2. ETD yang valid (tidak boleh kosong)\n";
echo "\nKolom ETD/ETA yang tidak punya qty > 0 akan DILEWATKAN sepenuhnya.\n\n";

echo "=== SOLUSI ===\n";
echo "Option A: Ambil semua ETD/ETA tanpa filter qty\n";
echo "  - Ubah logic: tidak skip berdasarkan qty\n";
echo "  - Gunakan qty=0 atau qty dari row lain\n\n";
echo "Option B: Ubah export format\n";
echo "  - Buat kolom terpisah untuk 'QTY' dan 'DATE RANGE'\n";
echo "  - ETD/ETA tetap ditampilkan meski qty=0\n\n";
echo "Option C: Gunakan qty minimum threshold\n";
echo "  - Ganti: if (\$qty === null || \$qty < 0) continue;\n";
echo "  - Sehingga qty=0 tetap diproses\n\n";
