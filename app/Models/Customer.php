<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    //
    protected $fillable = ['name', 'code', 'keterangan'];

    public function ports()
    {
        return $this->hasMany(Port::class);
    }
}
