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
            // Add carline_id column after customer
            $table->foreignId('carline_id')->nullable()->constrained('carline')->onDelete('restrict')->after('customer');
            
            // Add assy_id for direct reference to assy master
            $table->foreignId('assy_id')->nullable()->constrained('assy')->onDelete('restrict')->after('carline_id');
            
            // Add is_mapped flag
            $table->boolean('is_mapped')->default(false)->after('assy_id');
            
            // Add mapping_error to track issues
            $table->text('mapping_error')->nullable()->after('is_mapped');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('srs', function (Blueprint $table) {
            $table->dropForeignKeyIfExists(['carline_id']);
            $table->dropForeignKeyIfExists(['assy_id']);
            $table->dropColumn('carline_id', 'assy_id', 'is_mapped', 'mapping_error');
        });
    }
};
