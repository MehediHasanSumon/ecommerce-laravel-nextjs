<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourierProviderSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'provider' => $this->provider,
            'enabled' => (bool) $this->enabled,
            'sandbox_mode' => (bool) $this->sandbox_mode,
            'api_base_url' => $this->api_base_url,
            'api_key' => $this->api_key ? '********' : '',
            'api_secret' => $this->api_secret ? '********' : '',
            'webhook_secret' => $this->webhook_secret ? '********' : '',
            'default_store_id' => $this->default_store_id,
            'default_parcel_type' => $this->default_parcel_type,
            'default_item_description' => $this->default_item_description,
            'default_delivery_type' => $this->default_delivery_type,
            'default_payment_type' => $this->default_payment_type,
            'default_weight' => (float) $this->default_weight,
            'cod_amount_rule' => $this->cod_amount_rule,
            'custom_cod_amount' => round($this->custom_cod_amount_cents / 100, 2),
            'additional_configuration' => $this->additional_configuration ?: (object) [],
            'display_order' => (int) $this->display_order,
            'credentials_configured' => (bool) ($this->api_key && $this->api_secret),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
