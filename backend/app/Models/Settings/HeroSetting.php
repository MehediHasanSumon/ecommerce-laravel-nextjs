<?php

namespace App\Models\Settings;

use Illuminate\Database\Eloquent\Model;

class HeroSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'slider_autoplay' => 'boolean',
            'autoplay_delay' => 'integer',
            'infinite_loop' => 'boolean',
            'transition_speed' => 'integer',
            'show_navigation' => 'boolean',
            'show_pagination' => 'boolean',
            'keyboard_navigation' => 'boolean',
            'swipe_support' => 'boolean',
            'pause_on_hover' => 'boolean',
            'lazy_load_images' => 'boolean',
        ];
    }
}
