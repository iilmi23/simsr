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
        User::firstOrCreate(
            ['email' => 'admin@simsr.com'], // Cek berdasarkan email
            [
                'name' => 'Admin PPC',
                'email' => 'admin@simsr.com',
                'password' => Hash::make('jai2026'),
                'email_verified_at' => now(), // Langsung verified
            ]
        );

        $this->command->info('Admin users created successfully!');
    }
}