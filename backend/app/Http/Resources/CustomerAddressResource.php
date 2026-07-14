<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerAddressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'fullName' => $this->full_name,
            'phone' => $this->phone,
            'alternativePhone' => $this->alternative_phone,
            'email' => $this->email,
            'country' => $this->country,
            'state' => $this->state,
            'district' => $this->district,
            'city' => $this->city,
            'area' => $this->area,
            'postalCode' => $this->postal_code,
            'addressLine' => $this->address_line,
            'landmark' => $this->landmark,
            'addressLabel' => $this->address_label,
            'isDefaultBilling' => (bool) $this->is_default_billing,
            'isDefaultShipping' => (bool) $this->is_default_shipping,
        ];
    }
}
