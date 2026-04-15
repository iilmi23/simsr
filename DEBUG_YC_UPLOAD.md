# 🔧 Debugging Guide - Upload SR YC Error

## Error Message
```
Uncaught (in promise) Error: A listener indicated an asynchronous response by 
returning true, but the message channel closed before a response was received
```

---

## 🎯 Root Cause

Error ini **BUKAN** dari PHP/Laravel code. Ini adalah **browser-level message passing error**, biasanya dari:
1. ✅ Chrome extensions / browser add-ons
2. ✅ Service workers dengan message handlers yang tidak tepat  
3. ✅ Browser DevTools atau plugins

---

## ✅ Solusi Utama (Sudah Diterapkan)

### 1️⃣ Suppress Error di Frontend (DONE ✓)
- File: `resources/js/app.jsx`
- Menambahkan global error handler untuk suppress non-critical extension errors

### 2️⃣ Improve Error Handling Backend (DONE ✓)
- File: `app/Http/Controllers/SRController.php`
- Method: `runYCMapper()` dan `runMapper()`
- Menambahkan validasi struktur data dan memory management

### 3️⃣ Improve Error Handling Frontend (DONE ✓)
- File: `resources/js/Pages/UploadSR/Index.jsx`
- Better error display dan yang tidak crash dari error handler

---

## 🧪 Cara Test

### Option A: Test di Upload Page
1. Buka `http://localhost:8000/sr/upload`
2. Select customer YC
3. Upload file YC (XLSM)
4. Lihat apakah error masih muncul di console
5. Check apakah upload actually berhasil meskipun ada error

### Option B: Test CLI
```bash
php test_upload_yc.php
```

### Option C: Check Laravel Logs
```bash
tail -f storage/logs/laravel.log
```

---

## 🔍 Diagnostic Checklist

### ✓ Check Browser Console
1. Buka DevTools (`F12`)
2. Lihat tab **Console**
3. Errornya akan muncul di sana

**Jika error muncul tapi upload BERHASIL:**
- ✅ Ini bukan masalah serius
- ✅ Ini browser extension issue, bukan aplikasi issue
- ✅ Suppress sudah ditambahkan

### ✓ Check PHP Settings
```
max_execution_time: 0 ✓ OK (unlimited)
memory_limit: 512M ✓ OK
upload_max_filesize: 2G ✓ OK
post_max_size: 2G ✓ OK
```

### ✓ Check Laravel Logs
```bash
# Lihat last 50 lines
tail -50 storage/logs/laravel.log

# Filter error
grep "ERROR" storage/logs/laravel.log | tail -20
```

---

## 🛠️ Troubleshooting Steps

### Masalah: Error muncul, upload gagal

**Step 1: Disable Browser Extensions**
1. Chrome → Settings → Extensions
2. Disable satu-satu (terutama password managers, ad blockers)
3. Try upload lagi
4. Identifikasi mana extension yang bermasalah

**Step 2: Test di Incognito Mode**
```javascript
// Buka browser incognito/private mode
// Incognito mode disable semua extensions
// Try upload lagi
```

**Step 3: Check Laravel Logs**
```bash
# Clear logs
echo "" > storage/logs/laravel.log

# Upload file
# (perform upload through web UI)

# Check what error occurred
cat storage/logs/laravel.log
```

**Step 4: Test Direct Upload**
```bash
# Menggunakan curl untuk test upload tanpa browser
curl -X POST \
  -F "customer=ID" \
  -F "port=PORT_ID" \
  -F "file=@path/to/file.xlsx" \
  -F "sheet=0" \
  -H "X-CSRF-TOKEN:YOUR_CSRF_TOKEN" \
  http://localhost:8000/sr/upload
```

### Masalah: Upload timeout

**Check PHP settings:**
```bash
# php.ini
max_execution_time = 300  # 5 menit
post_max_size = 2G
upload_max_filesize = 2G
```

**Increase timeout di controller (jika perlu):**
```php
// Di uploadTaiwan() method
set_time_limit(600); // 10 minutes
```

### Masalah: Memory error

**Check memory:**
```bash
# php.ini
memory_limit = 1024M  # Increase dari 512M jika needed
```

---

## 📊 Key Files Modified

✓ `resources/js/app.jsx` - Global error handler  
✓ `app/Http/Controllers/SRController.php` - Better error logging  
✓ `resources/js/Pages/UploadSR/Index.jsx` - Improved error display  
✓ `app/Services/SR/YCMapper.php` - Per-sheet identifiers (sudah done sebelumnya)  

---

## 📌 Next Steps

1. **Build frontend** (jika development mode)
   ```bash
   npm run dev  # atau npm run build
   ```

2. **Test upload** dengan file YC yang ada

3. **Monitor logs** untuk memastikan tidak ada error yang serius

4. **Report findings** jika masalah persists

---

## ⚠️ Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Error tapi upload sukses | Browser ext | Ignore error, check DB |
| Upload timeout | Large file + slow server | Increase PHP timeout |
| Memory error | Big file processing | Increase memory_limit |
| Session lost | CSRF token expired | Refresh page & retry |
| File not found | Wrong path | Check file upload |

---

## 📞 Need Help?

Jika issue persist:
1. Share error message dari `storage/logs/laravel.log`
2. Share browser console screenshot
3. Share file size dan customer type
4. Share browser type dan extensions list
