<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HomeFeatureCardSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'enabled' => (bool) $this->enabled,
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
