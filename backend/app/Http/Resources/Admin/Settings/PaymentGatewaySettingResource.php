<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentGatewaySettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);
        foreach (['secret_key', 'api_key', 'webhook_secret'] as $key) {
            $data[$key] = $this->{$key} ? '********' : '';
        }

        return $data;
    }
}
