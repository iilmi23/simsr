<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Port;
use App\Models\SR;
use App\Models\SPP;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        // Hitung total data
        $totalCustomers = Customer::count();
        $totalPorts = Port::count();
        $totalSR = SR::count();
        $totalSPP = SPP::count();
        
        // Optional: Ambil data untuk grafik atau chart
        $recentCustomers = Customer::latest()->take(5)->get();
        $recentSR = SR::latest()->take(5)->get();
        
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_customers' => $totalCustomers,
                'total_ports' => $totalPorts,
                'total_sr' => $totalSR,
                'total_spp' => $totalSPP,
            ],
            'recent_customers' => $recentCustomers,
            'recent_sr' => $recentSR,
        ]);
    }
}