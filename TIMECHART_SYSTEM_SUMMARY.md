# 🎯 TimeChart System - Complete Implementation Summary

## 📌 Apa yang Sudah Dilakukan

### Problem Statement
Anda butuh TimeChart yang bisa:
1. ✅ **Pilih customer dulu** - untuk determine parser (sudah ada di frontend)
2. ✅ **Prevent duplikasi** - jika upload file yang sama berkali-kali
3. ✅ **Support multi-bulan upload** - template bisa tahunan/6-bulan/bulanan
4. ✅ **Track ETD berdasarkan week start** - dari template yang sudah fix

---

## ✅ Solutions Implemented

### 1. **Frontend Update** (TimeChart/index.jsx)
```jsx
// ADDED: Customer Selection in Upload Modal
- State: selectedCustomerId
- New dropdown to select customer before upload
- Customer determines parser (TYC, YNA, SAI, YC)
- Submit button disabled until file + customer selected
```

**File**: `resources/js/Pages/Master/TimeChart/index.jsx`

---

### 2. **Database Migration** (New)
```php
// File: database/migrations/2026_04_23_update_time_charts_for_deduplication.php
- Added: file_hash VARCHAR (SHA256 dari file)
- Added: last_upload_at TIMESTAMP
- Added: UNIQUE constraint (year, month, week_number)
```

**Why:**
- `file_hash`: Detect jika file yang sama diupload 2x → reject
- `UNIQUE constraint`: Prevent duplikasi entry (year, month, week) 
- `last_upload_at`: Track kapan terakhir di-update

---

### 3. **Controller Update** (TimeChartController.php)

#### OLD Logic (Problematic)
```php
TimeChart::where('year', $year)->where('month', $month)->delete();  // ❌ DELETE all
foreach ($timeChartData as $data) {
    TimeChart::create([...]);  // CREATE new
}
// RISK: Duplikasi jika upload 2x, data bisa hilang
```

#### NEW Logic (Fixed)
```php
$fileHash = $this->calculateFileHash($tempPath);  // SHA256

// Step 1: Detect duplikasi file
$existingHash = TimeChart::where('file_hash', $fileHash)->first();
if ($existingHash) {
    return error('File sudah pernah diupload');  // ✓ Reject
}

// Step 2: UPSERT per week (bukan DELETE all)
foreach ($timeChartData as $data) {
    $existing = TimeChart::where('year', $year)
        ->where('month', $month)
        ->where('week_number', $data['week_number'])
        ->first();
    
    if ($existing) {
        $existing->update([...]);  // UPDATE existing
        $updateCount++;
    } else {
        TimeChart::create([...]);  // INSERT new
        $insertCount++;
    }
}

// Response menunjukkan breakdown
return {
    'total_weeks': 5,
    'inserted': 5,      // 5 minggu baru
    'updated': 0        // 0 yang di-update
}
```

**Benefits:**
- ✅ Unique constraint prevent duplikasi
- ✅ File hash detect re-upload → reject
- ✅ UPSERT support update data lama tanpa delete
- ✅ Support template multi-bulan
- ✅ Better response feedback

---

## 📊 Database Schema Changes

### Before
```sql
CREATE TABLE time_charts (
    id BIGINT PRIMARY KEY,
    year INT,
    month TINYINT,
    week_number TINYINT,
    start_date DATE,
    end_date DATE,
    working_days JSON,
    total_working_days INT,
    source_file VARCHAR,
    upload_batch VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    INDEX (year, month, week_number),
    INDEX (upload_batch)
);
```

### After
```sql
ALTER TABLE time_charts ADD COLUMN (
    file_hash VARCHAR(64) NULL,          -- SHA256 hash
    last_upload_at TIMESTAMP NULL        -- Track update time
);

ALTER TABLE time_charts ADD CONSTRAINT 
    UNIQUE KEY unique_year_month_week (year, month, week_number);
```

---

## 🎮 How to Use

### Step 1: Run Migration
```bash
php artisan migrate
```

### Step 2: Inspect Template (Optional)
Lihat struktur Excel template untuk determine kolom yang benar:

```bash
php artisan tinker
```

Paste code dari `inspect_template.php`:
```php
// Will show header structure + sample data
// Determine kolom: WEEK NUMBER & START DATE
```

### Step 3: Configure YNA Parser
Edit `app/Http/Controllers/TimeChartController.php`:

```php
private function parseYNA($worksheet, int $year, int $month): array
{
    // Update dengan nama kolom sebenarnya dari template
    return $this->parseWithColumns(
        $worksheet,
        $year,
        $month,
        'WEEK',           // Nama kolom untuk week number
        'START DATE',     // Nama kolom untuk start date
        1                 // Row header (usually row 1)
    );
}
```

### Step 4: Upload & Test

**Test Scenario 1: Upload File Baru**
```
Customer: YNA
File: Template_Week_YNA_2026.xlsx
Month: April 2026
Result: "5 minggu berhasil diproses (5 baru, 0 update)"
```

**Test Scenario 2: Upload File Sama (Duplikasi)**
```
Upload file yang sama lagi
Result: "File ini sudah pernah diupload untuk bulan 4/2026" ✗
→ File ditolak, tidak duplikasi
```

**Test Scenario 3: Upload File Berbeda (Update)**
```
Edit template (ubah tanggal), upload lagi
Result: "5 minggu berhasil diproses (0 baru, 5 update)"
→ Data yang lama di-update, tidak duplikasi
```

---

## 📋 Files Modified / Created

### Modified
- `resources/js/Pages/Master/TimeChart/index.jsx` - Customer selector
- `app/Http/Controllers/TimeChartController.php` - UPSERT logic + file hash

### Created
- `database/migrations/2026_04_23_update_time_charts_for_deduplication.php` - Schema changes
- `TIMECHART_IMPLEMENTATION_GUIDE.md` - Full documentation
- `inspect_template.php` - Helper script
- `TIMECHART_SYSTEM_SUMMARY.md` - This file

---

## 🧪 SQL Queries untuk Monitoring

### Check data setelah upload:
```sql
SELECT year, month, week_number, 
       start_date, end_date,
       file_hash, upload_batch, last_upload_at
FROM time_charts
WHERE year = 2026 AND month = 4
ORDER BY week_number;
```

### Detect duplikasi:
```sql
SELECT year, month, week_number, 
       COUNT(*) as cnt
FROM time_charts
GROUP BY year, month, week_number
HAVING cnt > 1;
-- Should return 0 rows (duplicate tidak ada)
```

### Check file uploads:
```sql
SELECT DISTINCT file_hash, upload_batch, COUNT(*) as weeks
FROM time_charts
GROUP BY file_hash
ORDER BY upload_batch DESC;
```

---

## 🎯 YNA Week System - Reference

Dari `YNAExport.php`, week calculation:

```
April 2026:
- April 1 = Wednesday
- First Monday = March 30 (sebelumnya)

Week 1: Mon Mar 30 - Fri Apr 3
Week 2: Mon Apr 6 - Fri Apr 10
Week 3: Mon Apr 13 - Fri Apr 17
Week 4: Mon Apr 20 - Fri Apr 24
Week 5: Mon Apr 27 - Fri May 1 (OK, cross-month)
```

**Formula:**
```php
$date = date to find;
$month = date's month;

1. Find first Monday of or before month 1st
2. Count 7-day cycles from that Monday
3. week_number = cycles + 1
4. Cap at 5 weeks max
```

---

## 💡 Key Concepts

### 1. **File Hash Deduplication**
- SHA256 dari file contents
- Same file → same hash → reject
- Different file → different hash → allow

### 2. **Unique Constraint**
- Prevents 2 entries untuk (year, month, week)
- Database level protection
- Even jika logic error → database handles

### 3. **UPSERT Logic**
- UPDATE existing = better for corrections
- INSERT new = add missing weeks
- Mix both = flexible untuk template multi-bulan

### 4. **Multi-Month Support**
- Template tahunan? Upload 1x, system parse all months
- Template 6-bulan? Upload 1x untuk Jan-Jun
- Data organized per bulan, independent
- Week numbers per bulan (reset tiap bulan)

### 5. **ETD Calculation**
- Based on `start_date` dari template
- ETD = first working_day di minggu itu
- Automatic ketika SR di-upload

---

## 🚀 Next Steps Setelah Deployment

1. **Run migration** ✓ (harus dilakukan)
2. **Inspect template** - lihat struktur Excel
3. **Update parser** - sesuaikan kolom YNA
4. **Test upload** - verify functionality
5. **Monitor** - check SQL queries untuk verify no duplicates

---

## ⚠️ Important Notes

1. **BACKUP DATABASE** sebelum migration!
   ```bash
   php artisan backup:run
   ```

2. **Test di staging** dulu, baru production

3. **Old data (jika ada)** sudah ada di database:
   - File hash akan NULL (tidak ada di old records)
   - Tapi tidak masalah, logic tetap work
   - New uploads akan punya file_hash

4. **Unique constraint**:
   - Jika ada old duplicate data, migration bisa FAIL
   - Solusi: Manual cleanup duplikates terlebih dahulu
   ```sql
   DELETE FROM time_charts 
   WHERE id NOT IN (
       SELECT MIN(id) 
       FROM time_charts 
       GROUP BY year, month, week_number
   );
   ```

---

## 📞 Support

Jika ada issue:
1. Check log: `storage/logs/laravel.log`
2. Run query monitoring di atas untuk verify data
3. Check migration history: `php artisan migrate:status`

