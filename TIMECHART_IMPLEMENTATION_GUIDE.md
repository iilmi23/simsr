# TimeChart Implementation Guide - YNA Week & Deduplication

## 📋 Ringkasan Perbaikan

Anda telah menerapkan **deduplication logic** dan **file hashing** untuk TimeChart yang mencegah duplikasi ketika:
- Upload file yang sama berkali-kali (detected by `file_hash`)
- Upload template multi-bulan (tahunan/6-bulan/bulanan)
- Re-upload dengan perubahan kecil

---

## 🔧 Bagaimana Sistem Bekerja

### 1. **Sebelum (Problematic)**
```php
// Old logic: DELETE + INSERT = RISK DUPLIKASI
TimeChart::where('year', $year)->where('month', $month)->delete();
foreach ($timeChartData as $data) {
    TimeChart::create([...]);  // Buat entry baru
}
```

**Masalah:**
- Jika upload 2x file yang sama → 2x entry berbeda
- Tidak ada tracking file mana yang diupload
- Tidak bisa detect re-upload

### 2. **Sesudah (Fixed)**
```php
// New logic: UPSERT + FILE HASH DETECTION
$fileHash = $this->calculateFileHash($tempPath);

// Cek duplikasi berdasarkan file_hash
$existingHash = TimeChart::where('file_hash', $fileHash)->first();
if ($existingHash) {
    // File sudah pernah diupload → REJECT
    return error('File ini sudah pernah diupload');
}

// UPSERT: UPDATE jika ada, INSERT jika baru
foreach ($timeChartData as $data) {
    $existing = TimeChart::where('year', $year)
        ->where('month', $month)
        ->where('week_number', $data['week_number'])
        ->first();
    
    if ($existing) {
        $existing->update([...]);  // UPDATE
    } else {
        TimeChart::create([...]);  // INSERT
    }
}
```

**Keuntungan:**
- ✅ File re-upload terdeteksi dan ditolak
- ✅ Unique constraint mencegah duplikasi `(year, month, week_number)`
- ✅ Support template multi-bulan
- ✅ Tracking: `file_hash` + `last_upload_at`

---

## 📊 Database Schema - Kolom Baru

```php
// Migration: 2026_04_23_update_time_charts_for_deduplication.php
$table->string('file_hash')->nullable();           // SHA256 hash dari file
$table->timestamp('last_upload_at')->nullable();   // Terakhir di-upload
$table->unique(['year', 'month', 'week_number']); // Prevent duplikasi
```

**Jalankan Migration:**
```bash
php artisan migrate
```

---

## 🎯 YNA Week Calculation - Berdasarkan Template Anda

Template `Template_Week_YNA_2026.xlsx` menggunakan **Monday-based weeks**:

### Week Definition (YNA Standard)
- **Week 1**: Monday of the week containing the 1st of the month
- **Week 2-5**: Subsequent Mondays + 7 days
- **Weeks run Monday-Friday** (or Thursday-Friday untuk shipping)

### Example: April 2026
```
April 1, 2026 = Wednesday
↓
Monday sebelumnya: March 30, 2026 = Week 1 Start
↓
Week 1: Mon Mar 30 - Fri Apr 3
Week 2: Mon Apr 6 - Fri Apr 10  
Week 3: Mon Apr 13 - Fri Apr 17
Week 4: Mon Apr 20 - Fri Apr 24
Week 5: Mon Apr 27 - Fri May 1
```

### Week Calculation Algorithm (dari YNAExport.php)
```php
private function calculateYNAWeek($timestamp): int
{
    $date = Carbon::createFromTimestamp($timestamp);
    $firstOfMonth = $date->copy()->startOfMonth();
    
    // Find first Monday of or before month start
    $firstMonday = $firstOfMonth->copy()->startOfWeek(Carbon::MONDAY);
    
    // If first Monday is in previous month, move to next Monday
    if ($firstMonday->month !== $targetMonth) {
        $firstMonday->addWeek();
    }
    
    // Count 7-day cycles from first Monday
    $daysFromFirstMonday = $firstMonday->diffInDays($date, false);
    $weekNumber = intdiv($daysFromFirstMonday, 7) + 1;
    
    return min($weekNumber, 5);  // Cap at 5 weeks
}
```

---

## 🎮 Implementasi YNA Parser di TimeChartController

### Step 1: Update `parseYNA()` Method
Template YNA punya struktur kolom spesifik. Adjust sesuai template:

```php
/**
 * Parser YNA — sesuaikan nama kolom dengan template Anda
 */
private function parseYNA($worksheet, int $year, int $month): array
{
    // Nama kolom di template YNA
    $weekColName = 'WEEK';           // Atau 'WEEK NUMBER'
    $dateColName = 'START DATE';     // Atau 'WEEK START'
    $headerRow = 1;
    
    return $this->parseWithColumns(
        $worksheet,
        $year,
        $month,
        $weekColName,
        $dateColName,
        $headerRow
    );
}
```

### Step 2: Tentukan Kolom Template Anda
**Lihat template Excel untuk nama kolom sebenarnya:**
- Kolom untuk Week Number? (A, B, C, ...?)
- Kolom untuk Start Date? 
- Format date-nya: "MM/DD/YYYY", "DD/MM/YYYY", atau numeric?

### Step 3: Update `parseYNA()` dengan Info Template

Contoh jika template struktur:
```
Row 1: WEEK | START DATE | END DATE | WORKING DAYS
Row 2: 1    | 3/30/2026  | 4/3/2026 | 5
Row 3: 2    | 4/6/2026   | 4/10/2026| 5
...
```

Maka:
```php
private function parseYNA($worksheet, int $year, int $month): array
{
    // Sesuaikan dengan struktur template Anda
    return $this->parseWithColumns(
        $worksheet,
        $year,
        $month,
        'WEEK',         // Nama kolom week
        'START DATE',   // Pakai start date untuk identify bulan
        1               // Header di row 1
    );
}
```

---

## 🚀 Cara Testing

### Test 1: Upload File Baru
```
1. Buka TimeChart Management
2. Pilih Customer: YNA
3. Pilih file: Template_Week_YNA_2026.xlsx
4. Pilih Bulan: April 2026
5. Klik Upload
✓ Harusnya: "5 minggu berhasil diproses (5 baru, 0 update)"
```

### Test 2: Upload File Yang Sama
```
1. Upload file yang sama lagi
✓ Harusnya: "File ini sudah pernah diupload untuk bulan 4/2026"
✗ Error, file tidak akan duplikat
```

### Test 3: Upload File Berbeda, Minggu Sama
```
1. Edit file template (ubah tanggal saja)
2. Upload ulang
✓ Harusnya: "5 minggu berhasil diproses (0 baru, 5 update)"
✓ Existing data di-update, tidak duplikat
```

### Test 4: Template Multi-Bulan
Jika template mencakup beberapa bulan (misal Jan-Dec):
```
1. Upload untuk Tahun 2026
2. Sistem akan parse bulan yang sesuai
3. Data tersimpan per-bulan, tidak tercampur
```

---

## 📋 Checklist Konfigurasi

- [ ] Jalankan migration: `php artisan migrate`
- [ ] Tentukan struktur kolom template YNA dari file Excel
- [ ] Update `parseYNA()` dengan nama kolom yang benar
- [ ] Test upload file pertama
- [ ] Test upload file sama (harusnya reject)
- [ ] Test upload file berbeda (harusnya update, bukan duplikasi)
- [ ] Verify database: cek tabel `time_charts` punya data dengan `file_hash`

---

## 🔍 SQL Queries untuk Monitoring

```sql
-- Lihat semua TimeChart yang diupload
SELECT id, year, month, week_number, file_hash, upload_batch, 
       last_upload_at, created_at 
FROM time_charts 
ORDER BY year DESC, month DESC, week_number ASC;

-- Hitung duplikasi per batch
SELECT upload_batch, COUNT(*) as total_weeks, 
       COUNT(DISTINCT file_hash) as unique_files
FROM time_charts
GROUP BY upload_batch;

-- Find weeks yang sudah terupdate
SELECT year, month, week_number, 
       COUNT(*) as revision_count,
       GROUP_CONCAT(upload_batch) as batches
FROM time_charts
GROUP BY year, month, week_number
HAVING revision_count > 1;
```

---

## 💡 Notes

1. **file_hash** = SHA256 dari file contents
   - Identical files → same hash → detect duplikasi
   - Different file (even 1 byte) → different hash

2. **Unique Constraint** (year, month, week_number)
   - Cegah 2 entry untuk tahun/bulan/minggu yang sama
   - UPSERT logic update existing, insert new

3. **Support Template Multi-Bulan**
   - Jika template tahunan: upload 1x untuk tahun 2026
   - Parser akan ekstrak hanya bulan yang sesuai request
   - Data tersimpan per-bulan, per-minggu
   - Week numbers independent per bulan

4. **ETD Calculation**
   - Based on `start_date` dari template
   - ETD = hari pertama working_days dalam minggu itu
   - Automatic dihitung saat SR upload

