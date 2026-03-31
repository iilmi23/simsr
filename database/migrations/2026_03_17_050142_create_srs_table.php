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
        Schema::create('srs', function (Blueprint $table) {
            $table->id();

            $table->string('customer');
            $table->string('sr_number')->nullable();
            $table->string('source_file')->nullable();

            $table->string('part_number')->nullable();
            $table->integer('qty')->nullable();
            $table->date('delivery_date')->nullable();

            $table->date('etd')->nullable();
            $table->date('eta')->nullable();

            $table->string('week')->nullable();
            $table->string('route')->nullable();
            $table->string('port')->nullable();
            $table->string('model')->nullable();
            $table->string('family')->nullable();

            $table->json('extra')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('srs');
    }
};
