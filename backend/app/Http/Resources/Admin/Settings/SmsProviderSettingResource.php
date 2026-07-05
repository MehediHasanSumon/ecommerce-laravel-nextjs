<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SmsProviderSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);
        $data['api_key'] = $this->api_key ? '********' : '';
        $data['api_secret'] = $this->api_secret ? '********' : '';

        return $data;
    }
}
