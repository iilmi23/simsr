# Perbaikan YNA Mapper - Analisis & Solusi Lengkap

## MASALAH YANG DILAPORKAN

1. **QTY tidak bisa dibaca** - Nilai quantity tidak terbaca dengan benar
2. **ETD/ETA tidak bisa dibaca** - Tanggal pengiriman tidak terbaca dengan benar
3. **Sebelumnya bisa bekerja** - Data sebelumnya bisa langsung disimpan ke database
4. **Auto-save ke database** - Setelah upload SR, harus langsung otomatis bisa disimpan ke database
5. **Data week dari SR mapper customer** - Data minggu harus diambil dari SR file (bukan dibuat manual 1-2-3-4-5...)
6. **Week bisa diedit** - Data week harus bisa diedit di production week

## ANALISIS PENYEBAB

### Issue 1: QTY & ETD/ETA Tidak Terbaca

**Root Cause:**
- File Excel YNA mengandung **formula** yang belum terhitung saat dibaca
- `$this->parseDateValue()` dan `$this->parseInteger()` tidak menangani formula dengan benar
- Ketika `getCalculatedValue()` mengembalikan string formula (=...), nilai tidak dihitung

**Code Path:**
```php
// di YNAMapper.php line 233-238
$qtyRaw = $netRow[$colIdx] ?? null;

// Skip kolom jika formula string (belum terhitung)
if (is_string($qtyRaw) && str_starts_with(trim($qtyRaw), '=')) {
    Log::debug("Block row " . ($psaIdx + 1) . " col " . ($colIdx + 1) . ": qty masih formula, skip.");
    continue;
}
```

Masalah: Ketika formula ditemukan, **baris di-skip** tanpa fallback untuk mendapatkan nilai.

### Issue 2: Week Data Auto-Generated Bukan dari SR

**Current Behavior:**
- Di `SRController.php`, setelah mapping, week dibuat dari `ProductionWeek::findByDate()` 
- Jika tidak ada di production week, jatuh ke fallback manual
- **Tidak ada** mekanisme untuk ambil week number dari SR file mapper sendiri

**Missing Feature:**
- SR file customer (YNA) seharusnya sudah memiliki informasi week number
- System harus membaca week number tersebut dari struktur file
- Week number harus di-extract dan disimpan, kemudian bisa diedit di production week

## SOLUSI

### Perbaikan 1: Handle Formula Excel Properly

**File:** `app/Services/SR/YNAMapper.php`

Tambahkan fallback untuk mendapatkan nilai dari formula:
1. Jika formula ditemukan, coba hitung dengan cara lain
2. Implementasi ulang `parseInteger()` dan `parseDateValue()` untuk lebih robust
3. Log setiap kasus formula untuk debugging

### Perbaikan 2: Extract Week Number dari SR File

**Struktur YNA yang seharusnya:**
```
Kolom J, K, L, M, N, O, P...  = Week 1, 2, 3, 4, 5, 6, 7...
atau bisa ada label di atas yang menunjukkan week number
```

**Implementasi:**
1. Tambahkan method `extractWeekNumbersFromFile()` di YNAMapper
2. Parse header row untuk mendapatkan week numbers
3. Kembalikan mapping: `{ colIdx => weekNumber }`
4. Di mapper, gunakan informasi ini saat membuat records

### Perbaikan 3: Auto-Save & Production Week Integration

**Flow yang benar:**
```
1. Upload SR file YNA
2. YNAMapper extract week numbers dari file
3. Auto-generate ProductionWeek records jika belum ada
4. Insert SR records dengan week reference ke ProductionWeek
5. User bisa edit week di production week page
```

## IMPLEMENTASI LANGKAH DEMI LANGKAH

### Step 1: Perbaiki YNAMapper - Handle Formula & Extract Week

- [ ] Perbaiki `parseDateValue()` - handle formula & empty better
- [ ] Perbaiki `parseInteger()` - robust integer parsing
- [ ] Tambah `extractWeekNumbersFromFile()` - ambil week dari header
- [ ] Tambah week column index mapping di `parseBlock()`

### Step 2: Update SRController - Auto Week Generation

- [ ] Ubah logic untuk menggunakan week dari SR file (jika ada)
- [ ] Fallback ke ProductionWeek jika week tidak ada di SR
- [ ] Ensure ProductionWeek created dengan benar

### Step 3: Testing

- [ ] Test upload YNA file dengan formula
- [ ] Verify QTY terbaca dengan benar
- [ ] Verify ETD/ETA terbaca dengan benar
- [ ] Verify week numbers dari SR tersimpan
- [ ] Verify auto-save ke database berhasil

## EXPECTED RESULT

```
Sebelum:
- QTY: 0 atau kosong
- ETD/ETA: null atau salah
- Week: auto-generated (1-53)
- Manual: harus dibuat manual atau diedit manual

Sesudah:
- QTY: ✅ terbaca dari formula Excel
- ETD/ETA: ✅ terbaca dengan benar dari formula Excel
- Week: ✅ dari SR file customer (jika ada), bisa diedit
- Auto-save: ✅ langsung ke database tanpa manual intervention
- Production Week: ✅ terintegrasi dan editable
```

## FILES TO MODIFY

1. `app/Services/SR/YNAMapper.php` - Main mapper logic
2. `app/Http/Controllers/SRController.php` - Auto-save & week integration
3. Test files untuk verify fix

