<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HomePageSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'enable_product_section' => (bool) $this->enable_product_section,
            'products_per_section' => (int) $this->products_per_section,
            'enable_testimonial_section' => (bool) $this->enable_testimonial_section,
        ];
    }
}
