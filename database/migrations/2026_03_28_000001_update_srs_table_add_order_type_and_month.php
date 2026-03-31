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
            if (!Schema::hasColumn('srs', 'month')) {
                $table->string('month')->nullable()->after('week');
            }
            if (!Schema::hasColumn('srs', 'order_type')) {
                $table->string('order_type')->nullable()->after('month');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('srs', function (Blueprint $table) {
            if (Schema::hasColumn('srs', 'order_type')) {
                $table->dropColumn('order_type');
            }
            if (Schema::hasColumn('srs', 'month')) {
                $table->dropColumn('month');
            }
        });
    }
};
