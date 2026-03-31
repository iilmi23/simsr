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

    // ===================== SHIPMENTS =====================
    Route::get('/shipments', function () {
        return Inertia::render('Admin/Shipments');
    })->name('shipments');

    // ===================== MASTER CUSTOMER =====================
    Route::resource('customers', CustomerController::class);

    /*
    |--------------------------------------------------------------------------
    | PORTS (Nested Resource)
    |--------------------------------------------------------------------------
    */
    Route::resource('customers.ports', PortController::class);
    Route::get('/ports', [PortController::class, 'all'])->name('ports.index');

    // ===================== MASTER LAIN =====================
    Route::get('/carline', function () {
        return Inertia::render('Admin/Masters/CarLine');
    })->name('carline');

    // ===================== SR UPLOAD =====================
    Route::get('/sr/upload', [SRController::class, 'uploadPage'])->name('sr.upload.page');
    Route::post('/preview', [SRController::class, 'preview'])->name('sr.preview');
    Route::post('/sr/upload', [SRController::class, 'uploadTaiwan'])->name('sr.upload');

    // ===================== SUMMARY =====================
    Route::get('/summary', [SummaryController::class, 'index'])->name('summary.index');
    Route::get('/summary/{id}', [SummaryController::class, 'show'])->name('summary.show');
    Route::get('/summary/{id}/export', [SummaryController::class, 'export'])->name('summary.export');

    // ===================== SPP =====================
    Route::get('/spp', [SPPController::class, 'index'])->name('spp');
    Route::get('/spp/{period}', [SPPController::class, 'show'])->name('spp.show');

    Route::get('/history', function () {
        return Inertia::render('Admin/History');
    })->name('history');

    Route::get('/settings', function () {
        return Inertia::render('Admin/Settings');
    })->name('settings');

    // ===================== PROFILE =====================
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Auth bawaan Breeze
require __DIR__ . '/auth.php';
