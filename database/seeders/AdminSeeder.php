<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Cek apakah admin sudah ada, jika belum buat
        User::updateOrCreate(
            ['email' => 'admin@jai.co.id'], // Cek berdasarkan email
            [
                'name' => 'Admin PPC',
                'email' => 'admin@jai.co.id',
                'password' => Hash::make('jai2026!'),
                'email_verified_at' => now(), // Langsung verified
                'role' => 'admin',
            ]
        );

        // Buat user staff PPC
        User::updateOrCreate(
            ['email' => 'ppc1@jai.co.id'], // Cek berdasarkan email
            [
                'name' => 'PPC1',
                'email' => 'ppc1@jai.co.id',
                'password' => Hash::make('jai2026!'),
                'email_verified_at' => now(), // Langsung verified
                'role' => 'ppc_staff',
            ]
        );

        $this->command->info('Admin and Staff users created successfully!');
    }
}