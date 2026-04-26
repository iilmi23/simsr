# SIMSR Codebase Exploration Summary

## Overview
This document provides a comprehensive analysis of the SR (Shipping Request) system, including related models, controllers, upload flow, and database schema.

---

## 1. MODELS (app/Models/)

### Core SR Models

#### **SR.php**
- **Table:** `srs`
- **Primary Fields:**
  - `customer`, `source_file`, `upload_batch`, `sheet_index`, `sheet_name`
  - `part_number`, `assy_no`, `qty`, `total`
  - `delivery_date`, `etd`, `eta`, `week`, `month`, `order_type`
  - `route`, `port`, `model`, `family`, `extra` (JSON)
- **Methods:**
  - `getSummaryData()` - retrieves all SR records from same source file
- **Purpose:** Stores individual Shipping Request line items from uploaded Excel files
- **Fillable Fields:** 23 fields including customer, part number, quantities, dates, and classification

#### **Assy.php** (Assembly Master)
- **Table:** `assy`
- **Primary Fields:**
  - `carline_id` (FK), `part_number` (unique), `assy_code`, `level`, `type`
  - `umh` (decimal), `std_pack` (integer), `is_active` (boolean)
- **Relations:**
  - `carline()` - belongsTo CarLine
  - `spp()` - hasMany SPP
- **Methods:**
  - `getFullNameAttribute()` - returns "part_number - assy_code"
- **Purpose:** Master list of assemblies/parts with their carline mapping and packaging info
- **Indexing:** part_number, assy_code

#### **CarLine.php**
- **Table:** `carline`
- **Primary Fields:**
  - `code` (unique, max 20 chars)
  - `description` (nullable)
- **Relations:**
  - `assy()` - hasMany Assy
- **Purpose:** Car line/vehicle model master data; used to group assemblies by vehicle platform
- **Example codes:** JAI_TW, YNA, YC, SAI

#### **EtdMapping.php** (ETD to Production Week Mapping)
- **Table:** `etd_mappings`
- **Primary Fields:**
  - `customer_id` (FK), `etd_date` (date), `production_week_id` (FK)
  - `is_edited` (boolean), `edited_by` (FK user), `edited_at` (nullable)
- **Relations:**
  - `customer()` - belongsTo Customer
  - `productionWeek()` - belongsTo ProductionWeek
  - `editor()` - belongsTo User (via edited_by)
- **Unique Index:** (customer_id, etd_date)
- **Methods:**
  - `findByEtd($customerId, $etdDate)` - find mapping for specific ETD
  - `saveMapping($customerId, $etdDate, $weekId, $isEdited, $userId)` - upsert mapping
- **Purpose:** Maps ETD dates to production weeks for each customer; tracks manual edits

#### **ProductionWeek.php**
- **Table:** `production_weeks`
- **Primary Fields:**
  - `customer_id` (FK), `year`, `month_number`, `month_name`
  - `week_no`, `week_start` (date), `num_weeks` (integer)
- **Relations:**
  - `customer()` - belongsTo Customer
  - `sppRecords()` - hasMany Spp
  - `etdMappings()` - hasMany EtdMapping
- **Methods:**
  - `containsDate($date)` - checks if date falls within this week
- **Purpose:** Auto-generated production calendar weeks per customer

### Supporting Models

#### **Customer.php**
- **Table:** `customers`
- **Fields:** `name`, `code`, `keterangan`
- **Relations:** `ports()` - hasMany Port
- **Purpose:** Customer master data (JAI_TW, YNA, YC, SAI, etc.)

#### **SPP.php** (Shipping Parts Plan)
- **Table:** `spp_records`
- **Fields:** customer, part_number, model, family, month, week_label
  - delivery_date, eta, etd, qty, order_type, port
- **Purpose:** Shipping parts plan records (possibly derived from SR)

---

## 2. DATABASE SCHEMA

### SR Table Structure
```sql
srs (
  id, customer, sr_number, source_file, 
  sheet_index, sheet_name, part_number, assy_no,
  qty, total, delivery_date, etd, eta,
  week, month, order_type, route, port,
  model, family, extra (JSON),
  upload_batch, created_at, updated_at
)
```
**Key Features:**
- Tracks source file and batch for traceability
- Stores sheet metadata (index, name)
- JSON `extra` field for customer-specific data

### CarLine Table Structure
```sql
carline (
  id, code (unique), description, created_at, updated_at
)
```

### Assy Table Structure
```sql
assy (
  id, carline_id (FK), part_number (unique),
  assy_code, level, type, umh (decimal 10,6),
  std_pack, is_active (boolean),
  created_at, updated_at
)
Indexes: part_number, assy_code
```

### ETD Mappings Table Structure
```sql
etd_mappings (
  id, customer_id (FK), etd_date (date),
  production_week_id (FK), is_edited (boolean),
  edited_by (FK user nullable), edited_at (nullable),
  created_at, updated_at
)
Unique: (customer_id, etd_date)
Index: etd_date
```

### Production Weeks Table Structure
```sql
production_weeks (
  id, customer_id (FK), year, month_number,
  month_name, week_no, week_start (date),
  num_weeks, created_at, updated_at
)
```

### Key Relationships
```
Customer (1) ---← (Many) Port
         (1) ---← (Many) ProductionWeek
         (1) ---← (Many) EtdMapping

CarLine (1) ---← (Many) Assy

Assy (1) ---← (Many) SPP

ProductionWeek (1) ---← (Many) EtdMapping
               (1) ---← (Many) Spp
```

---

## 3. CONTROLLERS & ROUTES

### SRController.php Location
**Path:** [app/Http/Controllers/SRController.php](app/Http/Controllers/SRController.php)

### Public Methods

#### **uploadPage()**
- **Route:** `GET /sr/upload` (role: admin, staff, ppc_staff, ppc_supervisor, ppc_manager)
- **Returns:** Inertia view with customers and ports
- **Purpose:** Display SR upload page

#### **preview(Request $request)**
- **Route:** `POST /preview`
- **Validates:** file (xlsx), sheet (integer), customer (exists), port (nullable)
- **Process:**
  1. Store file temporarily
  2. Load Excel using PhpSpreadsheet
  3. Extract sheet data
  4. Get customer code and resolve mapper
  5. Extract sheet options (hidden columns/rows)
  6. Run mapper to transform data
  7. Check parts against Assy master
  8. Return preview stats (records, unique parts, FIRM/FORECAST counts, unknown parts)
- **Returns:** JSON response with preview data

#### **uploadTaiwan(Request $request)**
- **Route:** `POST /sr/upload` (role: admin, staff, ppc_staff, ppc_supervisor, ppc_manager)
- **Validates:** file (xlsx, max 50MB), sheet, customer, port (nullable)
- **Complete Upload Flow:**
  1. Store file temporarily
  2. Load Excel and get worksheet
  3. Validate customer & port requirements
  4. Resolve appropriate mapper (TYCMapper, YNAMapper, YCMapper, etc.)
  5. Extract sheet options
  6. Run mapper based on customer code:
     - **YC** → YCMapper with special handling
     - **Others** → Standard mapper
  7. **Auto-generate Production Weeks:**
     - Extract all ETD dates from mapped data
     - Call `WeekGenerator::generateFromDateRange()`
     - Resolve each ETD to a ProductionWeek
     - Store week_no, month_name, year in each record
  8. **Map to Master Assy:**
     - Look up each part_number in Assy table
     - Set `is_mapped=true/false` and `assy_id`
     - Store mapping error if part not found
  9. **Add Metadata:**
     - source_file, upload_batch (UUID), sheet_index, sheet_name
     - port, customer code, timestamps
  10. **Batch Insert:**
      - Split into chunks of 500
      - Insert with transaction
  11. **Return Status:** Success with counts (mapped, unmapped, total qty)

#### **index(Request $request)**
- **Route:** `GET /sr` or filtered view
- **Filters:** part_number, order_type, start_date, end_date
- **Returns:** Paginated SR records (50 per page) with summary stats

#### **destroy($id)**
- **Route:** `DELETE /sr/{id}`
- **Purpose:** Delete individual SR record

#### **remap($id)**
- **Purpose:** Manually remap unmapped part to Assy master
- **Returns:** JSON success/error

### Route Definitions
**File:** [routes/web.php](routes/web.php)

```php
// SR Upload (protected, specific roles)
Route::get('/sr/upload', [SRController::class, 'uploadPage'])
      ->name('sr.upload.page');
Route::post('/preview', [SRController::class, 'preview'])
      ->name('sr.preview');
Route::post('/sr/upload', [SRController::class, 'uploadTaiwan'])
      ->name('sr.upload');

// Summary view
Route::get('/summary', [SummaryController::class, 'index'])
      ->name('summary.index');
Route::get('/summary/{id}', [SummaryController::class, 'show'])
      ->name('summary.show');
Route::get('/summary/{id}/export', [SummaryController::class, 'export'])
      ->name('summary.export');
```

---

## 4. UPLOAD FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER UPLOADS FILE                                        │
│    - Select Customer, Port, Sheet Number                    │
│    - Submit Excel file (xlsx, max 50MB)                     │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PREVIEW (POST /preview)                                  │
│    - Validate input                                         │
│    - Store file temporarily                                 │
│    - Load Excel sheet                                       │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RESOLVE CUSTOMER MAPPER                                  │
│    - Get customer code from DB                              │
│    - SRMapperFactory::make() → returns appropriate mapper   │
│    - Options:                                               │
│      • JAI_TW → TYCMapper                                   │
│      • YNA → YNAMapper                                      │
│      • YC → YCMapper                                        │
│      • SAI → SAIMapper (todo)                               │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. EXTRACT SHEET OPTIONS                                    │
│    - Hidden columns                                         │
│    - Hidden rows                                            │
│    - Used by mappers to skip filtered data                  │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RUN MAPPER                                               │
│    - Convert Excel sheet to standardized format             │
│    - Extract:                                               │
│      • part_number, qty, delivery_date                      │
│      • etd, eta, order_type (FIRM/FORECAST)                 │
│      • model, family, port, route                           │
│    - Apply customer-specific logic                          │
│    - Each mapper handles unique sheet structure             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. RETURN PREVIEW (in preview mode)                         │
│    - Total records, unique parts                            │
│    - FIRM/FORECAST counts and totals                        │
│    - Unknown parts (not in Assy master)                     │
│    - First 50 rows sample                                   │
└──────────────┬──────────────────────────────────────────────┘
               │ (If user confirms, proceed to upload)
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. AUTO-GENERATE PRODUCTION WEEKS                           │
│    - Extract all ETD dates from mapped data                 │
│    - Find min/max ETD                                       │
│    - WeekGenerator::generateFromDateRange()                 │
│      → Creates ProductionWeek records for date range        │
│      → Each week: year, month_number, week_no, week_start   │
│    - For each record:                                       │
│      → WeekGenerator::resolveEtdMapping()                   │
│      → Find/create EtdMapping entry                         │
│      → Get production_week_id                               │
│      → Store week_no, month_name, year in record            │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. MAP TO MASTER ASSY                                       │
│    - For each record:                                       │
│      → Query Assy table: WHERE part_number = ?              │
│      → If found:                                            │
│         ✓ Set assy_id, is_mapped=true                       │
│      → If NOT found:                                        │
│         ✗ Set is_mapped=false, mapping_error               │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. ADD METADATA & BATCH INSERT                              │
│    - Add to each record:                                    │
│      • source_file (original filename)                      │
│      • upload_batch (UUID)                                  │
│      • sheet_index, sheet_name                              │
│      • port, customer (code)                                │
│      • created_at, updated_at timestamps                    │
│    - Chunk insert (500 per chunk)                           │
│    - Wrap in transaction                                    │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. RETURN SUCCESS/WARNING                                  │
│     - Total inserted records                                │
│     - Mapped vs Unmapped counts                             │
│     - Total quantity                                        │
│     - Warning if unmapped parts exist                       │
│     - Redirect to Summary view                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. MAPPERS (app/Services/SR/)

### Interface: SRMapperInterface
```php
interface SRMapperInterface {
    public function map(array $sheet): array;
}
```

### SRMapperFactory
**File:** [app/Services/SR/SRMapperFactory.php](app/Services/SR/SRMapperFactory.php)

Maps customer codes to mapper implementations:
- `'JAI_TW'` → `TYCMapper`
- `'YNA'` → `YNAMapper`
- Future: JAI_JP, SAI, US

### TYCMapper.php (JAI Taiwan)
**File:** [app/Services/SR/TYCMapper.php](app/Services/SR/TYCMapper.php)

**Sheet Structure:**
- Row 12 (index): FIRM/FORECAST flag row
- Row 13 (index): Time chart with year/month anchor (format: '2024/1')
- Row 17 (index): ETA PORT KAO
- Row 18 (index): Header row with PRODUCT NO, MODEL, FAMILY, NO, SFX, QTY LABEL

**Window Logic:**
- **FIRM:** Previous month + current month
- **FORECAST:** Current month + 4 months ahead
- Automatic year reconstruction from month sequence
- ETD from "ETD PORT SUR", ETA from row 17

**Data Extraction:**
- Detects week columns (1W, 2W, 3W, 4W, 5W)
- Extracts qty per week, calculates ETD/ETA
- Inherits FIRM/FORECAST from anchor column

### YNAMapper.php (Yazaki North America)
**File:** [app/Services/SR/YNAMapper.php](app/Services/SR/YNAMapper.php)

**Sheet Structure:**
- Uses "Final SR" sheet
- Block-based format: each part = 10-row block
- Block structure:
  - +0: PSA# (anchor)
  - +1: YNA Part#, Description, part_number
  - +2: Customer Part#
  - +3: High Fab, ETD Date, ETD values
  - +4: High Raw, ETA Date, ETA values
  - +5: Car line, Net, qty values
  - +6: Family, Cum (cumulative)
  - +7-9: Other info and separator

**Data Extraction:**
- Columns J+ (index 9+) = weekly data
- All records classified as FIRM
- ETA fallback: ETD + 42 days if ETA empty
- Reads directly from file (formulas need calculation)

### YCMapper.php
**Purpose:** Handles YC customer format
**Note:** Has special handling in SRController (separate execution path)

### Other Mappers
- **SAIMapper.php** - SAI format (details in mapper file)
- **JAIMapper.php** - JAI Japan format (todo)
- **ExcelReader.php** - Utility for reading Excel files

---

## 6. KEY SERVICES

### WeekGenerator (app/Services/WeekGenerator.php)
**File:** [app/Services/WeekGenerator.php](app/Services/WeekGenerator.php)

**Methods:**

#### `generateFromDateRange($customerId, $startDate, $endDate)`
- Auto-generates ProductionWeek records from date range
- Starts Monday before/on startDate
- Creates one week per 7 days
- Tracks weeks per month (num_weeks)
- Returns collection of created weeks

#### `findWeekByDate($customerId, $date)`
- Finds ProductionWeek containing given date
- Uses week_start date for comparison
- Returns most recent week <= date

#### `resolveEtdMapping($customerId, $etdDate, $userId=null)`
- Finds or creates EtdMapping for ETD date
- Returns production_week_id
- Used during upload to populate week info in SR records

---

## 7. DATA FLOW SUMMARY

### Input Data (Excel File)
```
Excel Sheet → TYCMapper/YNAMapper/etc → Array of records
```

### Record Structure After Mapping
```php
[
    'part_number'    => 'ABC123',
    'assy_no'        => 'XYZ456',
    'qty'            => 100,
    'delivery_date'  => '2026-05-15',
    'etd'            => '2026-05-10',
    'eta'            => '2026-06-20',
    'order_type'     => 'FIRM',        // or FORECAST
    'model'          => 'Model A',
    'family'         => 'Family B',
    'port'           => 'Port Code',
    'route'          => 'Route Info',
    'week'           => 2,
    'month'          => 'MAY',
    'year'           => 2026,
    // Metadata added during upload:
    'source_file'    => 'shipment_2026_05_15.xlsx',
    'upload_batch'   => 'uuid-string',
    'sheet_index'    => 0,
    'sheet_name'     => 'SR Data',
    'customer'       => 'JAI_TW',
    // Assy mapping:
    'assy_id'        => 5,
    'is_mapped'      => true,
    'mapping_error'  => null,
]
```

### Database Insertion
```
Mapped Records → Chunk (500 per chunk) → DB::insert() → SR table
                                      → Transaction (rollback on error)
```

---

## 8. RELEVANT FILES MAP

### Models
- [app/Models/SR.php](app/Models/SR.php) - Main SR model
- [app/Models/Assy.php](app/Models/Assy.php) - Assembly master
- [app/Models/CarLine.php](app/Models/CarLine.php) - Car line master
- [app/Models/EtdMapping.php](app/Models/EtdMapping.php) - ETD to week mapping
- [app/Models/ProductionWeek.php](app/Models/ProductionWeek.php) - Production calendar
- [app/Models/SPP.php](app/Models/SPP.php) - Shipping parts plan
- [app/Models/Customer.php](app/Models/Customer.php) - Customer master

### Controllers
- [app/Http/Controllers/SRController.php](app/Http/Controllers/SRController.php) - Main upload handler
- [app/Http/Controllers/AssyController.php](app/Http/Controllers/AssyController.php) - Assy CRUD + upload
- [app/Http/Controllers/CarlineController.php](app/Http/Controllers/CarlineController.php) - CarLine CRUD
- [app/Http/Controllers/ProductionWeekController.php](app/Http/Controllers/ProductionWeekController.php) - Week management

### Services
- [app/Services/SR/SRMapperFactory.php](app/Services/SR/SRMapperFactory.php) - Mapper factory
- [app/Services/SR/SRMapperInterface.php](app/Services/SR/SRMapperInterface.php) - Mapper interface
- [app/Services/SR/TYCMapper.php](app/Services/SR/TYCMapper.php) - JAI Taiwan mapper
- [app/Services/SR/YNAMapper.php](app/Services/SR/YNAMapper.php) - Yazaki North America mapper
- [app/Services/SR/YCMapper.php](app/Services/SR/YCMapper.php) - YC mapper
- [app/Services/SR/SAIMapper.php](app/Services/SR/SAIMapper.php) - SAI mapper
- [app/Services/WeekGenerator.php](app/Services/WeekGenerator.php) - Production week auto-generation

### Routes
- [routes/web.php](routes/web.php) - All web routes including SR upload

### Migrations
- [database/migrations/2026_03_17_050142_create_srs_table.php](database/migrations/2026_03_17_050142_create_srs_table.php) - Initial SR table
- [database/migrations/2026_04_23_040129_create_carline_table.php](database/migrations/2026_04_23_040129_create_carline_table.php) - CarLine table
- [database/migrations/2026_04_23_040153_create_assy_table.php](database/migrations/2026_04_23_040153_create_assy_table.php) - Assy table
- [database/migrations/2026_04_23_125757_create_etd_mappings_table.php](database/migrations/2026_04_23_125757_create_etd_mappings_table.php) - ETD mappings
- [database/migrations/2026_03_28_000002_create_spp_records_table.php](database/migrations/2026_03_28_000002_create_spp_records_table.php) - SPP records

---

## 9. KEY FEATURES & LOGIC

### 1. Multi-Customer Support
- Polymorphic mapper system supports different file formats per customer
- Currently supports: JAI_TW, YNA, YC, SAI
- Factory pattern for mapper selection

### 2. Automatic Week Generation
- Creates production weeks automatically from ETD date range
- Weeks aligned to Mondays
- Tracks weeks per month for reporting

### 3. Part Master Validation
- Cross-references part_number against Assy master
- Flags unmapped parts with error messages
- Allows manual remapping later

### 4. Batch Processing
- Chunks inserts into 500-record batches
- Transactional integrity (rollback on error)
- Handles large uploads efficiently

### 5. Sheet Metadata Tracking
- Stores source filename, sheet name, sheet index
- Groups records by upload_batch (UUID)
- Enables traceability and deletion by batch

### 6. Order Type Classification
- FIRM: Near-term confirmed orders (prev month + current month window)
- FORECAST: Forward-looking estimates (current month + 4 months)
- Window logic varies per customer mapper

### 7. ETD/ETA Mapping
- Auto-maps ETD dates to production weeks
- Supports ETA fallback calculations (e.g., ETD + 42 days for YNA)
- Maintains ETD Mapping table for tracking actual mappings

---

## 10. POTENTIAL ENHANCEMENTS

1. **Additional Customer Support:**
   - Implement JAIMapper for Japan format
   - Add USMapper for US format
   - Complete SAIMapper implementation

2. **Validation:**
   - Add port validation beyond customer check
   - Validate qty ranges (min/max)
   - Cross-validate part number with carline

3. **Reporting:**
   - Dashboard showing upload statistics
   - Batch-level reports
   - Unmapped parts trending

4. **Error Handling:**
   - Detailed error logs per mapper
   - Partial success with error report
   - Suggested corrections for unmapped parts

---

**Last Updated:** 2026-04-23
**Document Version:** 1.0
