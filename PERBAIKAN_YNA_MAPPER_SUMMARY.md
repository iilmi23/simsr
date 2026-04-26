# YNA Mapper Perbaikan - Summary Lengkap

## 📋 Perubahan yang Dilakukan

### 1. **YNAMapper.php** - Robust Data Parsing

#### ✅ Perbaikan: `parseInteger()` 
- Lebih robust dalam parsing nilai integer dari Excel
- Handle berbagai format (string, float, mixed dengan spasi)
- Skip formula string dengan logging untuk debug
- Sanity check: qty tidak boleh > 1 juta

```php
// Sebelum: parseInteger() sangat simpel, bisa skip formula
// Sesudah: handle formula dan return 0 jika tidak bisa parse
```

#### ✅ Perbaikan: `parseDateValue()`
- Improved logging saat date parsing gagal
- Better error handling untuk formula date
- Comment yang lebih jelas untuk sanity checks
- Format range tahun dibuat explicit (2000-2100)

```php
// Sebelum: bisa lewat formula tanpa warning proper
// Sesudah: log warning saat formula tidak bisa diparsing
```

#### ✅ Perbaikan: `parseBlock()` - QTY Handling
- **CRITICAL FIX**: Jangan skip kolom ketika ada formula QTY
- Sebelumnya: formula ditemukan → skip seluruh kolom
- Sesudah: formula ditemukan → coba parse → fallback qty = 0 dengan warning

```php
// Sebelum:
if (is_string($qtyRaw) && str_starts_with(trim($qtyRaw), '=')) {
    Log::debug("...formula..., skip.");
    continue;  // ❌ SKIP SELURUH KOLOM
}

// Sesudah:
if (is_string($qtyRaw) && str_starts_with(trim($qtyRaw), '=')) {
    $qty = $this->parseInteger($qtyRaw);  // ✅ Coba parse
    if ($qty === null) {
        $qty = 0;  // ✅ Fallback ke 0
        Log::warning("formula qty tidak terbaca, default 0. Raw: {$qtyRaw}");
    }
} else {
    $qty = $this->parseInteger($qtyRaw) ?? 0;
}
```

#### ✅ Fitur Baru: `extractWeekNumbersFromFile()`
- Extract week numbers dari file jika ada di header
- Pattern recognition: "Week 1", "W1", "1" (1-52)
- Fallback: jika tidak ada label week, return empty array
- Comments untuk future enhancement

```php
// Return: [ colIdx => weekNumber ]
// Contoh: [ 9 => 1, 10 => 2, 11 => 3, ... ]
```

---

### 2. **SRController.php** - Better Week Resolution

#### ✅ Perbaikan: Week Resolution Logic
- **Sebelumnya**: Hanya resolve dari ProductionWeek berdasarkan ETD
- **Sesudah**: 
  1. Cek jika mapper sudah provide week → gunakan itu
  2. Else: resolve dari ProductionWeek
  3. Else: fallback manual calculation dengan warning

```php
// Sebelum: straightforward mapping dari ProductionWeek

// Sesudah: 3-tier resolution strategy
if (!empty($item['week'])) {
    // Dari mapper (priority 1)
    // Tinggal resolve month/year jika perlu
} else if ($weekId = WeekGenerator::resolveEtdMapping(...)) {
    // Dari ProductionWeek (priority 2)
} else {
    // Manual fallback (priority 3, last resort)
}
```

#### ✅ Better Logging
- Log saat generate production weeks
- Log warning saat week fallback
- Lebih mudah trace issue di logs

---

## 🎯 Expected Behavior Setelah Perbaikan

### Skenario 1: QTY dari Formula Excel ✅
```
File YNA punya: =SUM(B10:B15) di kolom Net
Sebelumnya: Column discarded (tidak diproses)
Sesudah: ✅ Coba extract nilai → jika berhasil, gunakan; jika tidak, qty = 0
```

### Skenario 2: ETD/ETA dari Formula Excel ✅
```
File YNA punya: =DATE(2026,4,15) di kolom ETD
Sebelumnya: Bisa terbaca jika ExcelDate conversion berhasil
Sesudah: ✅ Lebih robust error handling, logging lebih baik
```

### Skenario 3: Week dari SR File ✅
```
File YNA punya: Header row dengan "Week 1", "Week 2", "Week 3"...
Sebelumnya: Tidak ada mekanisme extract week number
Sesudah: ✅ extractWeekNumbersFromFile() detect dan return week map
        ✅ SRController integrate week info ini ke production week
```

### Skenario 4: Auto-Save ke Database ✅
```
Upload SR file → Mapper process → Auto-generate weeks → Insert DB
Sebelumnya: Proses normal, tapi tidak optimal handling error
Sesudah: ✅ Better logging, error handling, dan week resolution
```

---

## 🧪 Testing

### File Test: `test_yna_mapper_fix.php`
```bash
# Jalankan test:
php artisan tinker
include 'test_yna_mapper_fix.php'

# Output:
# - 1️⃣  Map data dan test parsing
# - 2️⃣  Statistics (QTY, Date, Week)
# - 3️⃣  Week labels detection
# - 4️⃣  ETD range extraction
```

### Manual Testing:
1. Upload YNA file via web interface
2. Verify Preview menunjukkan QTY yang benar
3. Verify Preview menunjukkan ETD/ETA yang benar
4. Confirm dan simpan
5. Check Summary page:
   - Data tersimpan dengan quantity yang benar
   - ETD/ETA terisi dengan benar
   - Week terintegrasi dengan baik
6. Check TimeChart page:
   - Production week ter-generate dengan benar
   - Bisa edit week info

---

## 📝 Key Changes Summary

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| **Formula QTY** | Skip kolom ❌ | Parse dengan fallback ✅ |
| **Formula Date** | Throw/skip ❌ | Better error handling ✅ |
| **Week Info** | Dari ProductionWeek only | Cek SR file + ProductionWeek ✅ |
| **Logging** | Basic | Detailed dengan context ✅ |
| **Auto-save** | Normal flow | Improved error handling ✅ |

---

## 🚀 How to Use

1. **Jika masih ada issue dengan formula:**
   - Check logs: `storage/logs/laravel.log`
   - Cari pattern: "formula qty tidak terbaca", "formula etd", "formula eta"
   - Ini akan menunjukkan baris dan kolom mana yang bermasalah

2. **Jika week tidak terintegrasi:**
   - Check apakah ProductionWeek ter-generate
   - Go to Production Week page → check minggu ada atau tidak
   - Jika tidak ada, generate manual atau cek ETD range

3. **Untuk debugging:**
   - Enable detailed logging di `config/logging.php`
   - Jalankan test file: `test_yna_mapper_fix.php`
   - Check output untuk memastikan parsing berhasil

---

## 📌 Important Notes

- **Backward Compatible**: Perubahan tidak breaking existing functionality
- **Formula Handling**: Agak lebih lenient sekarang (qty = 0 fallback) vs skip sebelumnya
- **Week Resolution**: 3-tier strategy lebih robust dari sebelumnya
- **Logging**: Jauh lebih detail, memudahkan debugging kedepan

