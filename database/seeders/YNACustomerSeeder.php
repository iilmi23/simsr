<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Customer;

class YNACustomerSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Customer::updateOrCreate(
            ['code' => 'YNA'], // Cek berdasarkan code
            [
                'name' => 'Yazaki North America',
                'code' => 'YNA',
                'keterangan' => 'YNA customer for SR uploads'
            ]
        );
    }
}