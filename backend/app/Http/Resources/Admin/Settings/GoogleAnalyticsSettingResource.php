<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GoogleAnalyticsSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'enabled' => (bool) $this->enabled,
            'measurement_id' => $this->measurement_id,
            'api_secret' => $this->api_secret ? '********' : '',
            'enhanced_ecommerce' => (bool) $this->enhanced_ecommerce,
            'debug_mode' => (bool) $this->debug_mode,
            'user_id_tracking' => (bool) $this->user_id_tracking,
            'server_side_events' => (bool) $this->server_side_events,
            'client_side_events' => (bool) $this->client_side_events,
            'anonymize_ip' => (bool) $this->anonymize_ip,
            'respect_consent_mode' => (bool) $this->respect_consent_mode,
            'connection_status' => $this->connection_status,
            'last_successful_event_at' => optional($this->last_successful_event_at)->toISOString(),
            'last_connection_attempt_at' => optional($this->last_connection_attempt_at)->toISOString(),
            'last_response' => $this->last_response ?: (object) [],
            'last_error' => $this->last_error,
            'credentials_configured' => (bool) ($this->measurement_id && $this->api_secret),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
