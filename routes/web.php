<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Root route - Redirect berdasarkan status login
Route::get('/', function () {
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
});

/*
|--------------------------------------------------------------------------
| Protected Routes (Memerlukan Login)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {

    // ===================== DASHBOARD =====================
    Route::get('/dashboard', function () {
        return Inertia::render('Admin/Dashboard');
    })->name('dashboard');

    // ===================== SHIPMENTS =====================
    Route::get('/shipments', function () {
        return Inertia::render('Admin/Shipments');
    })->name('shipments');

    // ===================== MASTERS =====================
    Route::prefix('masters')->name('masters.')->group(function () {
        Route::get('/customer', function () {
            return Inertia::render('Admin/Masters/Customer');
        })->name('customer');

        Route::get('/ports', function () {
            return Inertia::render('Admin/Masters/Ports');
        })->name('ports');

        Route::get('/carline', function () {
            return Inertia::render('Admin/Masters/CarLine');
        })->name('carline');
    });

    // ===================== UPLOAD SR =====================
    Route::get('/upload-sr', function () {
        return Inertia::render('Admin/UploadSR');
    })->name('upload-sr');

    // ===================== SUMMARY =====================
    Route::get('/summary', function () {
        return Inertia::render('Admin/Summary');
    })->name('summary');

    // ===================== SPP =====================
    Route::get('/spp', function () {
        return Inertia::render('Admin/SPP');
    })->name('spp');

    // ===================== HISTORY =====================
    Route::get('/history', function () {
        return Inertia::render('Admin/History');
    })->name('history');

    // ===================== SETTINGS =====================
    Route::get('/settings', function () {
        return Inertia::render('Admin/Settings');
    })->name('settings');

    // ===================== PROFILE (dari Breeze) =====================
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Auth routes dari Breeze
require __DIR__ . '/auth.php';