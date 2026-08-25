<?php

namespace App\Http\Resources\Admin;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Customer
 */
class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'mobile' => $this->mobile,
            'email' => $this->email,
            'address' => $this->address,
            'status' => $this->status,
            'due' => $this->total_due,
            'total_due' => $this->total_due,
            'total_spent' => $this->total_spent,
            'total_orders' => $this->orders_count ?? $this->orders()->count(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
