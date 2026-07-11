<?php

namespace App\Models\Settings;

use Illuminate\Database\Eloquent\Model;

class HomePageSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enable_product_section' => 'boolean',
            'products_per_section' => 'integer',
            'enable_testimonial_section' => 'boolean',
        ];
    }
}
