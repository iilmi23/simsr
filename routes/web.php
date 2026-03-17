<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PortController;
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
        return Inertia::render('Admin/Dashboard');
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

    // ===================== MASTER LAIN =====================
    Route::get('/carline', function () {
        return Inertia::render('Admin/Masters/CarLine');
    })->name('carline');

    // ===================== FITUR LAIN =====================
    Route::get('/upload-sr', function () {
        return Inertia::render('Admin/UploadSR');
    })->name('upload-sr');

    Route::get('/summary', function () {
        return Inertia::render('Admin/Summary');
    })->name('summary');

    Route::get('/spp', function () {
        return Inertia::render('Admin/SPP');
    })->name('spp');

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
