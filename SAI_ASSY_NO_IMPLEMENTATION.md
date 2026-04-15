# SAI Mapper - ASSY NO Implementation Summary

## Objective
Capture ASSY NO from BUPPIN (alternative part name) field in SAI Excel files instead of using the full PART NUMBER.

## Changes Made

### 1. Database Schema
**File:** `database/migrations/2026_04_13_add_assy_no_to_srs_table.php`
- Added new nullable string column `assy_no` to `srs` table
- Positioned after `part_number` for logical grouping
- Migration applied successfully ✅

### 2. SR Model
**File:** `app/Models/SR.php`
- Added `'assy_no'` to the `$fillable` array
- Allows mass assignment of the new field

### 3. SAI Mapper
**File:** `app/Services/SR/SAIMapper.php`
- Line 244: Added `'assy_no' => $buppin` to the result array
- Captures BUPPIN (Column C) from SAI Excel as ASSY NO
- BUPPIN is the "alternative part name" in SAI structure

### 4. Export Classes
**Files:** 
- `app/Exports/SummaryExport.php` (base class for SAIExport, YCExport)
- `app/Exports/YNAExport.php` (independent export)

**Changes:**
- Updated data row building to use `assy_no` if available
- Fallback to `part_number` if `assy_no` is null/empty (backward compatible)
- Logic: `$assyNo = ($firstItem->assy_no && $firstItem->assy_no !== '') ? $firstItem->assy_no : $partNumber;`

## SAI Excel Structure

```
Column A: No.
Column B: PART NUMBER    (e.g., "8901234567") ← stored as part_number
Column C: BUPPIN         (e.g., "ASSY-0012")   ← now stored as assy_no
Column D+: QTY data
```

## Data Flow

```
SAI Excel File
    ↓
SAIMapper.map()
    ├─ Column B → SR.part_number
    ├─ Column C → SR.assy_no  ✅ (NEW)
    └─ Column E+: QTY, dates, etc.
         ↓
Database (srs table)
         ↓
Export (SummaryExport, YNAExport)
    ├─ Display Column A: NO
    ├─ Display Column B: ASSY NO  (uses assy_no if available) ✅
    └─ Display Column C+: Order Type, QTY data
```

## Backward Compatibility
- `assy_no` field is nullable
- Exports fallback to `part_number` if `assy_no` is not set
- Existing data without `assy_no` will continue to work
- Only SAI mapper populates `assy_no` from BUPPIN

## Testing
All PHP files validated for syntax errors ✅

## Affected Exports
1. **SummaryExport** (base class)
   - Used by SAIExport
   - Used by YCExport (indirectly by SAIExport)
   
2. **YNAExport** (independent)
   - Updated for consistency
   
3. **YCExport** (inherits from SummaryExport)
   - No direct changes needed
   
4. **SAIExport** (inherits from YCExport)
   - No direct changes needed
   - Uses SummaryExport's array() method

## Next Steps
1. Run migration: `php artisan migrate` ✅ (already done)
2. Test SAI upload with a sample file
3. Verify ASSY NO displays correctly in exports
