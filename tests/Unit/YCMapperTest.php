<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\SR\YCMapper;

class YCMapperTest extends TestCase
{
    public function test_yc_mapper_can_be_instantiated()
    {
        $mapper = new YCMapper();
        $this->assertInstanceOf(YCMapper::class, $mapper);
    }

    public function test_yc_mapper_map_method_throws_exception()
    {
        $mapper = new YCMapper();

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('YCMapper::map() tidak boleh dipanggil langsung');

        $mapper->map([]);
    }
}