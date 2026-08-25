<?php

namespace App\Models\Settings;

use Illuminate\Database\Eloquent\Model;

class FooterSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'payment_banner_enabled' => 'boolean',
            'social_links' => 'array',
        ];
    }
}
