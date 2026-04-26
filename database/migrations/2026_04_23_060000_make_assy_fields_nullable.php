<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('assy', function (Blueprint $table) {
            $table->string('assy_code', 20)->nullable()->change();
            $table->string('level', 20)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assy', function (Blueprint $table) {
            $table->string('assy_code', 20)->nullable(false)->change();
            $table->string('level', 20)->nullable(false)->change();
        });
    }
};
