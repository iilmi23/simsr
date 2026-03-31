<?php

namespace App\Services\SR;

interface SRMapperInterface
{
    public function map(array $sheet): array;
}