# YNA Mapper Perbaikan - Implementation Guide untuk Developer

## 🔍 Apa yang Diperbaiki?

Ini adalah perbaikan untuk issue dimana:
1. ❌ QTY dari Excel formula tidak terbaca (sebelumnya skip)
2. ❌ ETD/ETA dari Excel formula tidak terbaca (sebelumnya throw/skip)
3. ❌ Week number tidak terintegrasi dengan baik ke Production Week
4. ❌ Auto-save ke database tidak optimal handling formula data

## 📁 Files Modified

### 1. `app/Services/SR/YNAMapper.php`
Mapper utama untuk YNA customer

**Methods yang diubah:**
- `parseInteger()` - Lebih robust, handle formula dengan fallback
- `parseDateValue()` - Better error handling, detailed logging
- `parseBlock()` - **CRITICAL**: Jangan skip kolom dengan formula QTY
  
**Methods yang ditambah:**
- `extractWeekNumbersFromFile()` - Extract week labels dari file (jika ada)

**Key Logic Changes:**

```php
// SEBELUM (BUGGY):
if (is_string($qtyRaw) && str_starts_with(trim($qtyRaw), '=')) {
    Log::debug("...formula..., skip.");
    continue;  // ❌ SKIP KOLOM INI, DATA HILANG!
}

// SESUDAH (FIXED):
if (is_string($qtyRaw) && str_starts_with(trim($qtyRaw), '=')) {
    $qty = $this->parseInteger($qtyRaw);  // ✅ Coba parse
    if ($qty === null) {
        $qty = 0;  // ✅ Fallback dengan warning
        Log::warning("formula qty tidak terbaca, default 0");
    } else {
        Log::debug("formula qty parsed: {$qty}");
    }
}
```

### 2. `app/Http/Controllers/SRController.php`
Upload handler dan week resolution logic

**Method yang diubah:**
- `uploadTaiwan()` - Section "AUTO-GENERATE WEEKS & ETD MAPPING" 

**Key Logic Changes:**

```php
// SEBELUM: Langsung resolve dari ProductionWeek saja
$weekId = WeekGenerator::resolveEtdMapping($customerId, $item['etd']);
if ($weekId) { ... }
else { fallback manual }

// SESUDAH: 3-tier resolution strategy
if (!empty($item['week'])) {
    // Priority 1: Dari mapper (jika ada week info di file)
    // Tinggal resolve month/year jika perlu
}
else if ($weekId = WeekGenerator::resolveEtdMapping(...)) {
    // Priority 2: Dari ProductionWeek (default)
}
else {
    // Priority 3: Fallback manual calculation (last resort)
}
```

## 🚀 How to Test Locally

### Quick Test via Tinker

```bash
php artisan tinker

# Load mapper
$mapper = new App\Services\SR\YNAMapper;

# Test dengan path file actual
$file = '/path/to/yna_file.xlsx';
$result = $mapper->map([], null, $file, 0, null);

# Inspect hasil
echo "Total records: " . count($result) . "\n";
echo "Sample record: " . json_encode($result[0], JSON_PRETTY_PRINT) . "\n";

# Test week extraction
$weeks = $mapper->extractWeekNumbersFromFile($file);
echo "Week labels: " . json_encode($weeks) . "\n";

# Test ETD range
[$min, $max] = $mapper->extractEtdRangeFromFile($file);
echo "ETD Range: {$min} to {$max}\n";
```

### Verification Script

```bash
# Jalankan verification script (jika file sudah disimpan di Laravel project)
php verify_yna_fix.php /path/to/yna_file.xlsx

# Output akan menunjukkan:
# - Statistics: QTY, Date, Week analysis
# - Data quality assessment
# - Recommendations
```

## 📊 Expected Changes in Behavior

### Scenario 1: File dengan Formula QTY

**Before:**
```
File: kolom J berisi =SUM(...)
Hasil: Column J di-skip, record dengan qty dari J tidak dibuat
Impact: Data hilang, qty kosong
```

**After:**
```
File: kolom J berisi =SUM(...)
Hasil: ✅ Coba parse formula → jika berhasil gunakan nilai
       ⚠️ Jika gagal, qty = 0 dengan warning di log
Impact: ✅ Data tidak hilang, tetap ada record (walau qty 0)
```

### Scenario 2: File dengan Formula ETD/ETA

**Before:**
```
File: kolom K berisi =DATE(2026,4,15)
Hasil: Tergantung ExcelDate conversion berhasil atau tidak
Impact: Inconsistent behavior
```

**After:**
```
File: kolom K berisi =DATE(2026,4,15)
Hasil: ✅ Better handling, detailed logging
Impact: ✅ More predictable, easier to debug jika ada issue
```

### Scenario 3: Week Integration

**Before:**
```
Flow: Upload → Map → Resolve week dari ProductionWeek only
Missing: Jika file punya week labels, tidak digunakan
Impact: Bisa ada week mismatch
```

**After:**
```
Flow: Upload → Map → Check week from mapper → Resolve from ProductionWeek → Fallback manual
Better: ✅ Week priority: SR file > ProductionWeek > Manual
Impact: ✅ Better week accuracy, terutama jika customer provide week labels
```

## 🐛 Debugging & Troubleshooting

### Issue: QTY masih 0 setelah perbaikan

**Check logs:**
```bash
tail -f storage/logs/laravel.log | grep -i "qty"
```

**Look for patterns:**
- `"formula qty tidak terbaca, default 0"` → Formula parsing gagal
- `"formula qty parsed: {$qty}"` → Formula berhasil di-parse
- `"Block row X part Y col Z: qty negatif"` → Qty negative (skip intentional)

**Action:**
1. Check file Excel apakah formula valid
2. Check apakah formula return numeric value
3. Jika perlu, simplify formula di Excel atau update parseInteger() logic

### Issue: ETD/ETA masih kosong

**Check logs:**
```bash
tail -f storage/logs/laravel.log | grep -i "date\|etd\|eta"
```

**Look for patterns:**
- `"ExcelDate conversion failed"` → Excel date format tidak recognize
- `"Date parsing failed"` → String date format tidak match
- `"...ETD label tidak cocok"` → File structure berbeda dari expected

**Action:**
1. Verify file struktur sesuai dengan YNA format
2. Check Excel apakah date cells proper formatted sebagai Date
3. Update format list di parseDateValue() jika perlu

### Issue: Week null setelah upload

**Check:**
```bash
# Via tinker
$weeks = \App\Models\ProductionWeek::where('customer_id', 1)->get();
echo "Total weeks: " . count($weeks) . "\n";

# Check range ETD dari hasil SR
$sr = \App\Models\SR::where('customer', 'YNA')->select('etd')->distinct()->get();
echo "ETD range: " . min($sr->pluck('etd')) . " to " . max($sr->pluck('etd')) . "\n";
```

**Action:**
1. Jika ProductionWeek kosong, trigger manual generation
2. Check apakah WeekGenerator working correctly
3. View logs untuk error di week generation step

## 🔧 Code Maintenance Tips

### 1. When Modifying parseInteger()
- Always preserve fallback behavior (return 0 if can't parse)
- Add detailed logging untuk debugging
- Test dengan various input types: int, float, string, formula

### 2. When Modifying parseDateValue()
- Always check year sanity (2000-2100)
- Add logging saat format parsing gagal
- Test dengan various date formats dari customer

### 3. When Adding New Mapper Methods
- Follow existing patterns (logging, error handling)
- Add docstring dengan CATATAN about file structure
- Think about backward compatibility

### 4. When Modifying SRController Flow
- Keep the 3-tier resolution strategy intact:
  1. From mapper/file
  2. From ProductionWeek
  3. Fallback manual (last resort with warning)
- Always log week resolution untuk debugging

## 📝 Documentation Notes

### For YNAMapper Users:
- File harus memiliki sheet "Final SR"
- Data struktur: 10-baris blocks dengan PSA# anchor
- Formula cells akan di-parse (graceful degradation)
- Week labels optional (auto-resolve dari ProductionWeek)

### For Time Chart / Summary Pages:
- week_source di extra JSON: "production_week" atau "fallback" atau "mapper"
- Gunakan untuk distinguish antara "resolved from file" vs "auto-calculated"
- Bisa di-extend untuk custom week handling

## ✅ Acceptance Criteria

Perbaikan dianggap berhasil jika:
1. ✅ QTY dari formula terbaca dengan benar
2. ✅ ETD/ETA dari formula terbaca dengan benar
3. ✅ No data loss (kolom dengan formula tidak di-skip)
4. ✅ Auto-save ke database berhasil tanpa manual intervention
5. ✅ Week ter-integrate dengan baik ke Production Week
6. ✅ Logs mencerminkan apa yang terjadi (debugging friendly)
7. ✅ Backward compatible (tidak breaking existing functionality)

## 🚀 Future Enhancements

1. **Week Label Detection**: Jika customer sering provide week labels, optimize pattern recognition
2. **Formula Caching**: Cache parsed formula values untuk performance
3. **Custom Validators**: Add custom validation rules per customer
4. **Bulk Week Generation**: Optimize ProductionWeek generation untuk large date ranges
5. **Data Quality Reports**: Generate report showing parsing success/failure rates

