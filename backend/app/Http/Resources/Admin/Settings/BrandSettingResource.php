<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BrandSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $enabled = (bool) $this->enabled;

        return [
            'id' => $this->id,
            'enabled' => $enabled,
            'show_on_home' => $enabled && (bool) $this->show_on_home,
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
