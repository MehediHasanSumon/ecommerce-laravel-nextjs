<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MetaPixelSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'enabled' => (bool) $this->enabled,
            'pixel_id' => $this->pixel_id,
            'conversions_api_enabled' => (bool) $this->conversions_api_enabled,
            'access_token' => $this->access_token ? '********' : '',
            'test_event_code' => $this->test_event_code ? '********' : '',
            'dataset_id' => $this->dataset_id,
            'automatic_event_tracking' => (bool) $this->automatic_event_tracking,
            'advanced_matching' => (bool) $this->advanced_matching,
            'server_side_tracking' => (bool) $this->server_side_tracking,
            'browser_side_tracking' => (bool) $this->browser_side_tracking,
            'debug_mode' => (bool) $this->debug_mode,
            'connection_status' => $this->connection_status,
            'last_successful_event_at' => optional($this->last_successful_event_at)->toISOString(),
            'last_connection_attempt_at' => optional($this->last_connection_attempt_at)->toISOString(),
            'last_response' => $this->last_response ?: (object) [],
            'last_error' => $this->last_error,
            'credentials_configured' => (bool) ($this->pixel_id && $this->access_token),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
