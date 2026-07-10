<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class PaymentMethodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $config = (array) ($this->additional_configuration ?? []);

        return [
            'gateway' => $this->gateway,
            'name' => $config['display_name'] ?? Str::headline(str_replace('_', ' ', $this->gateway)),
            'description' => $config['checkout_description'] ?? null,
            'logoUrl' => $config['logo_url'] ?? null,
            'sandboxMode' => (bool) $this->sandbox_mode,
            'sortOrder' => (int) $this->display_order,
        ];
    }
}
