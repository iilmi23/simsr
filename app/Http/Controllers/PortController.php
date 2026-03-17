<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Port;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PortController extends Controller
{
    public function index(Customer $customer)
    {
        $ports = $customer->ports()->latest()->get();

        return Inertia::render('Ports/Index', [
            'customer' => $customer,
            'ports' => $ports
        ]);
    }

    public function create(Customer $customer)
    {
        return Inertia::render('Ports/Create', [
            'customer' => $customer
        ]);
    }

    public function store(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string'
        ]);

        $customer->ports()->create($validated);

        return redirect()
            ->route('customers.ports.index', $customer->id)
            ->with('success', 'Port created successfully');
    }

    public function edit(Customer $customer, Port $port)
    {
        return Inertia::render('Ports/Edit', [
            'customer' => $customer,
            'port' => $port
        ]);
    }

    public function update(Request $request, Customer $customer, Port $port)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string'
        ]);

        $port->update($validated);

        return redirect()
            ->route('customers.ports.index', $customer->id)
            ->with('success', 'Port updated successfully');
    }

    public function destroy(Customer $customer, Port $port)
    {
        $port->delete();

        return redirect()
            ->route('customers.ports.index', $customer->id)
            ->with('success', 'Port deleted successfully');
    }
}