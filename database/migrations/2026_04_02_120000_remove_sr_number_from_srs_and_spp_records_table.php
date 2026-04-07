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
            if (Schema::hasColumn('srs', 'sr_number')) {
                $table->dropColumn('sr_number');
            }
        });

        Schema::table('spp_records', function (Blueprint $table) {
            if (Schema::hasColumn('spp_records', 'sr_number')) {
                $table->dropColumn('sr_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('srs', function (Blueprint $table) {
            if (!Schema::hasColumn('srs', 'sr_number')) {
                $table->string('sr_number')->nullable()->after('customer');
            }
        });

        Schema::table('spp_records', function (Blueprint $table) {
            if (!Schema::hasColumn('spp_records', 'sr_number')) {
                $table->string('sr_number')->nullable()->after('customer');
            }
        });
    }
};
