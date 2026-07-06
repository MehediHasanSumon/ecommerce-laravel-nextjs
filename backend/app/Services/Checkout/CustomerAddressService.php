<?php

namespace App\Services\Checkout;

use App\Models\CustomerAddress;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CustomerAddressService
{
    public function create(User $user, array $payload): CustomerAddress
    {
        return DB::transaction(function () use ($user, $payload): CustomerAddress {
            $data = AddressData::normalize($payload);
            $data['user_id'] = $user->id;
            $address = CustomerAddress::query()->create($data);
            $this->syncDefaults($address);

            return $address->fresh();
        });
    }

    public function update(CustomerAddress $address, array $payload): CustomerAddress
    {
        return DB::transaction(function () use ($address, $payload): CustomerAddress {
            $address->update(AddressData::normalize($payload));
            $this->syncDefaults($address);

            return $address->fresh();
        });
    }

    public function delete(CustomerAddress $address): void
    {
        $address->delete();
    }

    private function syncDefaults(CustomerAddress $address): void
    {
        if ($address->is_default_billing) {
            CustomerAddress::query()
                ->where('user_id', $address->user_id)
                ->whereKeyNot($address->id)
                ->update(['is_default_billing' => false]);
        }

        if ($address->is_default_shipping) {
            CustomerAddress::query()
                ->where('user_id', $address->user_id)
                ->whereKeyNot($address->id)
                ->update(['is_default_shipping' => false]);
        }
    }
}
