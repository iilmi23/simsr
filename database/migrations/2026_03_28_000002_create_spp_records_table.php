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
        Schema::create('spp_records', function (Blueprint $table) {
            $table->id();
            $table->string('customer');
            $table->string('sr_number')->nullable();
            $table->string('part_number');
            $table->string('model')->nullable();
            $table->string('family')->nullable();
            $table->string('month');
            $table->string('week_label')->nullable();
            $table->date('delivery_date');
            $table->string('eta')->nullable();
            $table->string('etd')->nullable();
            $table->integer('qty')->default(0);
            $table->string('order_type');
            $table->string('port')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spp_records');
    }
};
