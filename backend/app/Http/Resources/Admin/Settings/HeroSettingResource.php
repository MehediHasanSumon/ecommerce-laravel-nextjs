<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HeroSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'enabled' => (bool) $this->enabled,
            'mode' => $this->mode,
            'slider_autoplay' => (bool) $this->slider_autoplay,
            'autoplay_delay' => (int) $this->autoplay_delay,
            'infinite_loop' => (bool) $this->infinite_loop,
            'show_navigation' => (bool) $this->show_navigation,
            'show_pagination' => (bool) $this->show_pagination,
            'swipe_support' => (bool) $this->swipe_support,
            'pause_on_hover' => (bool) $this->pause_on_hover,
            'lazy_load_images' => (bool) $this->lazy_load_images,
        ];
    }
}
