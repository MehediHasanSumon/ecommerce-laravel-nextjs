<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\OrderResource;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Customer
 */
class CustomerDetailResource extends JsonResource
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
            'total_orders' => $this->orders()->count(),
            'orders' => OrderResource::collection($this->orders()->latest('placed_at')->limit(20)->get()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
