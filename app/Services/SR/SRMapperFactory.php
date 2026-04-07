<?php

namespace App\Services\SR;

use App\Services\SR\TYCMapper;
use App\Services\SR\YNAMapper;

class SRMapperFactory
{
    public static function make($customer)
    {
        return match ($customer) {
            'JAI_TW' => new TYCMapper(),
            'YNA' => new YNAMapper(),
            // nanti tambah:
            // 'JAI_JP' => new JAIMapper(),
            // 'SAI' => new SAIMapper(),
            // 'US' => new USMapper(),
        };
    }
}