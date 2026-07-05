<?php

namespace App\Models\Settings;

use Illuminate\Database\Eloquent\Model;

class HomeFeatureCardSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
        ];
    }
}
