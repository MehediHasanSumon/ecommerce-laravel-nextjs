<?php

namespace App\Models\Settings;

use Illuminate\Database\Eloquent\Model;

class BrandSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'show_on_home' => 'boolean',
        ];
    }
}
