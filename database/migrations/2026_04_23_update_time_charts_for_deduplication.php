<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Improvements:
     * - Tambah file_hash untuk detect duplikasi file
     * - Tambah unique constraint (year, month, week_number) 
     * - Hapus foreign keys yang tidak perlu
     * - Better indexing untuk query performa
     */
    public function up(): void
    {
        Schema::table('time_charts', function (Blueprint $table) {
            // Tambah kolom file_hash untuk detect re-upload
            $table->string('file_hash')->nullable()->after('source_file');
            
            // Tambah kolom untuk tracking upload terakhir
            $table->timestamp('last_upload_at')->nullable()->after('file_hash');
            
            // Drop index lama jika ada dan buat yang baru
            try {
                $table->dropIndex(['year', 'month', 'week_number']);
            } catch (\Exception $e) {
                // Index mungkin tidak ada
            }
            
            // Buat unique constraint untuk prevent duplikasi
            // (year, month, week_number) HARUS unik
            $table->unique(['year', 'month', 'week_number'], 'unique_year_month_week');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('time_charts', function (Blueprint $table) {
            $table->dropUnique('unique_year_month_week');
            $table->dropColumn(['file_hash', 'last_upload_at']);
        });
    }
};
