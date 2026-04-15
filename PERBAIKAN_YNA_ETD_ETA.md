<?php
/**
 * PENJELASAN PERBAIKAN: YNA ETD/ETA Data Tidak Terekstrak Semua
 * 
 * MASALAH AWAL:
 * =============
 * Mapper melewatkan kolom ETD/ETA jika quantity (qty) = 0 atau kosong.
 * 
 * Karena kondisi:
 *   if ($qty === null || $qty <= 0) continue;
 * 
 * Menyebabkan:
 * - Kolom dengan qty=0 → ETD/ETA DILEWATKAN
 * - Kolom dengan qty kosong → ETD/ETA DILEWATKAN
 * - Hanya kolom dengan qty > 0 yang diproses
 * 
 * SOLUSI:
 * =======
 * Ubah logic untuk memproses kolom ETD/ETA TERLEBIH DAHULU, qty bersifat OPTIONAL
 * 
 * SEBELUM:
 * --------
 * 1. Check qty (required) → SKIP jika null/empty/<=0
 * 2. Check ETD → SKIP jika null
 * 3. Check ETA → fallback atau skip
 * 
 * SESUDAH:
 * --------
 * 1. Check ETD (required) → SKIP hanya jika null
 * 2. Check ETA → fallback auto jika kosong
 * 3. Check qty (optional) → DEFAULT 0 jika kosong
 * 4. SKIP hanya jika qty < 0 (truly invalid)
 * 
 * PERUBAHAN KODE:
 * ================
 * File: app/Services/SR/YNAMapper.php
 * Function: parseBlock()
 * 
 * Baris 212-228 (sebelum):
 *   Check qty dulu → skip kolom (QTY-FIRST approach)
 *   
 * Baris 212-235 (sesudah):
 *   Check ETD dulu → qty optional dengan default 0 (ETD-FIRST approach)
 *   
 * DAMPAK:
 * =========
 * ✓ Semua kolom dengan ETD valid akan dicapture
 * ✓ Meski qty kosong/0, ETD/ETA tetap masuk export
 * ✓ Export akan lebih lengkap
 * ⚠ Jumlah record bisa lebih banyak (termasuk qty=0)
 * 
 * TESTING:
 * ===========
 * Kolom dengan struktur:
 *   ETD=2026-03-22, ETA=2026-04-22, QTY=0
 *   → SEBELUM: DILEWATKAN
 *   → SESUDAH: DICAPTURE dengan qty=0
 */
echo "✓ Perbaikan selesai! Export YNA sekarang akan mencapture SEMUA kolom ETD/ETA tanpa filter qty.\n";
