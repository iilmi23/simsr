# ACTION CHECKLIST - YNA Mapper Perbaikan

## 🎯 Pre-Implementation

- [ ] **Review semua perubahan**
  - [ ] Baca `PERBAIKAN_YNA_MAPPER_LENGKAP.md`
  - [ ] Baca `PERBAIKAN_YNA_MAPPER_SUMMARY.md`
  - [ ] Review actual code changes di YNAMapper.php
  - [ ] Review actual code changes di SRController.php

- [ ] **Backup current state**
  - [ ] Backup database
  - [ ] Backup git repo (commit/tag current state)

- [ ] **Prepare test data**
  - [ ] Siapkan sample YNA file dengan formula QTY
  - [ ] Siapkan sample YNA file dengan formula ETD/ETA
  - [ ] Siapkan sample YNA file normal (tanpa formula)

---

## 🧪 Local Testing

- [ ] **Unit Testing**
  - [ ] Test `parseInteger()` dengan berbagai input
  - [ ] Test `parseDateValue()` dengan berbagai format
  - [ ] Test `parseBlock()` dengan formula QTY
  - [ ] Test `extractWeekNumbersFromFile()`

  ```bash
  # Jalankan via Tinker:
  php artisan tinker
  $mapper = new App\Services\SR\YNAMapper;
  # Test each method
  ```

- [ ] **Integration Testing**
  - [ ] Upload file YNA dengan formula via web interface
  - [ ] Verify Preview menunjukkan QTY correct
  - [ ] Verify Preview menunjukkan ETD/ETA correct
  - [ ] Confirm dan verify auto-save ke database
  - [ ] Check Summary page untuk data integrity
  - [ ] Check TimeChart untuk week mapping

- [ ] **Verification Scripts**
  - [ ] Jalankan `test_yna_mapper_fix.php`
  - [ ] Jalankan `verify_yna_fix.php` dengan sample files
  - [ ] Check output untuk data quality assessment

---

## 📊 Pre-Production Validation

- [ ] **Code Review**
  - [ ] Review changes tidak ada syntax error
  - [ ] Review logging messages informatif
  - [ ] Review error handling proper
  - [ ] Review backward compatibility

- [ ] **Database Integrity**
  - [ ] Check existing SR records tidak affected
  - [ ] Check ProductionWeek generation works
  - [ ] Check EtdMapping creation works
  - [ ] Verify no orphaned records

- [ ] **Performance Check**
  - [ ] No significant slowdown saat parsing
  - [ ] Memory usage reasonable
  - [ ] Query execution time acceptable

- [ ] **Log Analysis**
  - [ ] Check logs tidak ada critical errors
  - [ ] Check warnings reasonable & informative
  - [ ] Check debug info sufficient untuk troubleshooting

---

## 🚀 Production Deployment

- [ ] **Pre-Deployment Checklist**
  - [ ] All local tests passed
  - [ ] Code review approved
  - [ ] Documentation complete
  - [ ] Rollback plan ready

- [ ] **Deployment Steps**
  1. [ ] Pull latest changes ke production
  2. [ ] Verify file checksums (YNAMapper.php, SRController.php)
  3. [ ] Run `php artisan config:clear`
  4. [ ] Run `php artisan cache:clear`
  5. [ ] Monitor logs immediately after

- [ ] **Post-Deployment Verification (immediate)**
  - [ ] Web interface accessible
  - [ ] Upload page works
  - [ ] Test dengan simple file upload
  - [ ] Check logs tidak ada errors

---

## ✅ Post-Deployment Monitoring

### Hour 1
- [ ] Monitor `storage/logs/laravel.log` untuk errors
- [ ] Test upload dengan 1-2 sample files
- [ ] Check database untuk new records
- [ ] Verify Summary page displays correctly

### Hour 2-4
- [ ] Test dengan berbagai file types
- [ ] Monitor logs kontinyu
- [ ] Check queue jobs jika ada (event processing)
- [ ] Verify no memory leaks

### Day 1
- [ ] Test dengan actual customer files
- [ ] Verify week generation works
- [ ] Check TimeChart untuk accuracy
- [ ] Get feedback dari users

### Week 1
- [ ] Monitor logs untuk warnings/errors
- [ ] Analyze parsing success rates
- [ ] Check data quality metrics
- [ ] Document any issues found

---

## 🐛 Issue Response Plan

### Jika QTY masih 0 setelah perbaikan:
- [ ] Check logs: `tail -f storage/logs/laravel.log | grep -i "qty"`
- [ ] Inspect file Excel apakah formula valid
- [ ] Run `verify_yna_fix.php` dengan file tersebut
- [ ] Review `parseInteger()` logic jika perlu
- [ ] Contact dev team jika pattern issue

### Jika ETD/ETA masih kosong:
- [ ] Check logs: `tail -f storage/logs/laravel.log | grep -i "date"`
- [ ] Verify file struktur sesuai YNA format
- [ ] Check Excel date cells proper formatted
- [ ] Run `verify_yna_fix.php` untuk diagnosis
- [ ] Update format list di `parseDateValue()` jika perlu

### Jika week tidak ter-resolve:
- [ ] Check ProductionWeek created via: 
  ```php
  php artisan tinker
  \App\Models\ProductionWeek::where('customer_id', 1)->count()
  ```
- [ ] Check ETD range dari SR: 
  ```php
  \App\Models\SR::where('customer', 'YNA')->minmax('etd')
  ```
- [ ] Trigger manual week generation jika perlu
- [ ] Check WeekGenerator logs

### Jika critical error terjadi:
1. [ ] Check stack trace di logs
2. [ ] Assess impact (data loss? system down?)
3. [ ] Decide: Fix immediately vs Rollback
4. [ ] Implement rollback jika perlu:
   ```bash
   git revert <commit-hash>
   php artisan migrate:reset  # if data schema changed (not in this case)
   ```
5. [ ] Notify stakeholders

---

## 📚 Documentation & Knowledge Transfer

- [ ] **Internal Documentation**
  - [ ] Store all docs di project repo
  - [ ] Add links ke internal wiki
  - [ ] Share dengan team

- [ ] **Developer Knowledge Transfer**
  - [ ] Conduct team meeting explaining changes
  - [ ] Walk through code changes
  - [ ] Explain debugging process
  - [ ] Discuss maintenance going forward

- [ ] **Customer Communication** (if needed)
  - [ ] Notify customers of improved data handling
  - [ ] Provide guidance if formula format changes needed
  - [ ] Offer support jika ada issues

---

## 🎓 Maintenance & Future

- [ ] **Maintenance Plan**
  - [ ] Schedule regular log reviews
  - [ ] Monitor parsing success rates
  - [ ] Track formula-related issues
  - [ ] Plan future enhancements

- [ ] **Knowledge Base Updates**
  - [ ] Document any customizations needed
  - [ ] Add to FAQ jika ada common issues
  - [ ] Create runbooks untuk troubleshooting

- [ ] **Performance Monitoring**
  - [ ] Set up alerts untuk formula parsing failures
  - [ ] Monitor database growth
  - [ ] Track upload processing time
  - [ ] Alert jika degradation detected

---

## 📋 Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | ✓ Tested |
| Code Reviewer | | | ⏳ Pending |
| QA Lead | | | ⏳ Pending |
| DevOps/Ops | | | ⏳ Pending |
| Product Owner | | | ⏳ Pending |

---

## 📞 Support Contacts

- **Technical Issues**: Dev team
- **Database Issues**: DBA
- **System Issues**: DevOps
- **Customer Issues**: Support team

---

## 📝 Notes

- Estimated time untuk full implementation: **1-2 days**
- Rollback risk: **LOW** (backward compatible, no DB changes)
- Testing coverage: **HIGH** (all critical paths covered)
- Expected user impact: **POSITIVE** (better data handling, auto-save more reliable)

---

**Last Updated**: April 23, 2026
**Version**: 1.0

