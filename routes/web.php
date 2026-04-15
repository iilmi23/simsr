<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SummaryController;
use App\Http\Controllers\SPPController;
use App\Http\Controllers\PortController;
use App\Http\Controllers\SRController;
use App\Models\Customer;
use App\Models\Port;
use App\Models\SR;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Redirect root berdasarkan login
Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

/*
|--------------------------------------------------------------------------
| Protected Routes (WAJIB LOGIN)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {

    // ===================== DASHBOARD =====================
    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_customers' => Customer::count(),
                'total_ports' => Port::count(),
                'total_sr' => SR::count(),
            ],
            'recent_customers' => Customer::latest()->take(5)->get(),
            'recent_sr' => SR::latest()->take(5)->get(),
        ]);
    })->name('dashboard');

    // ===================== PPC & ADMIN PAGES =====================
    Route::get('/sr/upload', [SRController::class, 'uploadPage'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('sr.upload.page');

    Route::post('/preview', [SRController::class, 'preview'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('sr.preview');

    Route::post('/sr/upload', [SRController::class, 'uploadTaiwan'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('sr.upload');

    Route::get('/summary', [SummaryController::class, 'index'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('summary.index');
    Route::get('/summary/export', [SummaryController::class, 'exportAll'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('summary.exportAll');
    Route::get('/summary/{id}', [SummaryController::class, 'show'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('summary.show');
    Route::get('/summary/{id}/data', [SummaryController::class, 'data'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('summary.data');
    Route::get('/summary/{id}/export', [SummaryController::class, 'export'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('summary.export');
    Route::delete('/summary/{id}', [SummaryController::class, 'destroy'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('summary.destroy');

    Route::get('/spp', [SPPController::class, 'index'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('spp');
    Route::get('/spp/{period}', [SPPController::class, 'show'])
        ->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
        ->name('spp.show');

    Route::get('/history', function () {
        return Inertia::render('Admin/History');
    })->middleware(['role:admin,staff,ppc_staff,ppc_supervisor,ppc_manager'])
      ->name('history');

    // ===================== ADMIN ONLY =====================
    Route::middleware(['role:admin'])->group(function () {
        Route::get('/shipments', function () {
            return Inertia::render('Admin/Shipments');
        })->name('shipments');

        Route::resource('customers', CustomerController::class);

        Route::resource('customers.ports', PortController::class);
        Route::get('/ports', [PortController::class, 'all'])->name('ports.index');

        Route::get('/carline', function () {
            return Inertia::render('Admin/Masters/CarLine');
        })->name('carline');

        Route::get('/settings', function () {
            return Inertia::render('Admin/Settings');
        })->name('settings');

        Route::get('/debug/logs', function () {
            $logFile = storage_path('logs/laravel.log');
            $logs = [];

            if (file_exists($logFile)) {
                $lines = array_slice(file($logFile), -50); // Get last 50 lines
                $logs = array_reverse($lines); // Show newest first
            }

            return Inertia::render('Admin/Logs', [
                'logs' => $logs,
                'logFile' => $logFile
            ]);
        })->name('debug.logs');

        // ===================== USER MANAGEMENT =====================
        Route::prefix('admin')->group(function () {
            Route::resource('users', \App\Http\Controllers\UserController::class);
        });

        Route::get('/debug/sr-latest', function () {
            $latestUploads = \App\Models\SR::orderBy('created_at', 'desc')
                ->limit(10)
                ->get(['id', 'customer', 'source_file', 'upload_batch', 'part_number', 'qty', 'created_at']);

            $totalByBatch = \App\Models\SR::selectRaw('upload_batch, COUNT(*) as count, SUM(qty) as total_qty, MAX(created_at) as latest_upload')
                ->groupBy('upload_batch')
                ->orderBy('latest_upload', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'latest_records' => $latestUploads,
                'batches_summary' => $totalByBatch,
                'total_sr_records' => \App\Models\SR::count()
            ]);
        })->name('debug.sr.latest');
    });

});

// Auth bawaan Breeze

// Auth bawaan Breeze
require __DIR__ . '/auth.php';

