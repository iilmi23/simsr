<?php

namespace App\Exports;

/**
 * YCExport — Export untuk customer YC
 * Menggunakan struktur dari SummaryExport tapi dengan warna custom: Yellow (FIRM) dan Orange (FORECAST)
 */
class YCExport extends SummaryExport
{
    // Inherits all logic dan styling dari SummaryExport
    // Color customization bisa dilakukan melalui override di sini jika diperlukan
}