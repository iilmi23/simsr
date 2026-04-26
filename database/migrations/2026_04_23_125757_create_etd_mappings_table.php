<?php
// database/migrations/2026_04_23_000002_create_etd_mappings_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('etd_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->date('etd_date');
            $table->foreignId('production_week_id')->constrained('production_weeks')->onDelete('cascade');
            $table->boolean('is_edited')->default(false);
            $table->foreignId('edited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();
            
            $table->unique(['customer_id', 'etd_date']);
            $table->index('etd_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('etd_mappings');
    }
};