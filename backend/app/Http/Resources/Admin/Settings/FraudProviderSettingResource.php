<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FraudProviderSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'provider' => $this->provider,
            'enabled' => (bool) $this->enabled,
            'sandbox_mode' => (bool) $this->sandbox_mode,
            'api_url' => $this->api_url,
            'api_key' => $this->api_key ? '********' : '',
            'api_secret' => $this->api_secret ? '********' : '',
            'additional_configuration' => $this->additional_configuration ?: (object) [],
            'connection_status' => $this->connection_status,
            'last_successful_connection_at' => optional($this->last_successful_connection_at)->toISOString(),
            'last_connection_attempt_at' => optional($this->last_connection_attempt_at)->toISOString(),
            'last_error' => $this->last_error,
            'circuit_open_until' => optional($this->circuit_open_until)->toISOString(),
            'display_order' => (int) $this->display_order,
            'credentials_configured' => (bool) $this->api_key,
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
