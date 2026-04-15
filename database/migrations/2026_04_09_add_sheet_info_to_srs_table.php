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
        Schema::table('srs', function (Blueprint $table) {
            $table->integer('sheet_index')->nullable()->after('source_file');
            $table->string('sheet_name')->nullable()->after('sheet_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('srs', function (Blueprint $table) {
            $table->dropColumn(['sheet_index', 'sheet_name']);
        });
    }
};
