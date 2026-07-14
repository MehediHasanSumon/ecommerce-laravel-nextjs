<?php

namespace App\Services\Checkout;

use App\Models\CustomerAddress;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CustomerAddressService
{
    public function create(User $user, array $payload): CustomerAddress
    {
        return $this->createOrReuse($user, $payload);
    }

    public function createOrReuse(User $user, array $payload): CustomerAddress
    {
        return DB::transaction(function () use ($user, $payload): CustomerAddress {
            $data = AddressData::normalize($payload);
            $data = $this->applyDefaultAlias($data, $payload);

            $existing = $this->findDuplicate($user, $data);
            if ($existing) {
                $this->applyRequestedDefaults($existing, $data);

                return $existing->fresh();
            }

            $data['user_id'] = $user->id;
            $address = CustomerAddress::query()->create($data);
            $this->syncDefaults($address);

            return $address->fresh();
        });
    }

    public function update(CustomerAddress $address, array $payload): CustomerAddress
    {
        return DB::transaction(function () use ($address, $payload): CustomerAddress {
            $data = AddressData::normalize($payload);
            $data = $this->applyDefaultAlias($data, $payload);
            $address->update($data);
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

    private function findDuplicate(User $user, array $data): ?CustomerAddress
    {
        $fingerprint = $data['duplicate_fingerprint'] ?? AddressData::fingerprint($data);

        $existing = CustomerAddress::query()
            ->where('user_id', $user->id)
            ->where('duplicate_fingerprint', $fingerprint)
            ->first();

        if ($existing) {
            return $existing;
        }

        return CustomerAddress::query()
            ->where('user_id', $user->id)
            ->whereNull('duplicate_fingerprint')
            ->get()
            ->first(function (CustomerAddress $address) use ($fingerprint): bool {
                return AddressData::fingerprint(AddressData::normalize($address->toArray())) === $fingerprint;
            });
    }

    private function applyRequestedDefaults(CustomerAddress $address, array $data): void
    {
        $updates = [];

        if ($data['is_default_billing'] ?? false) {
            $updates['is_default_billing'] = true;
        }

        if ($data['is_default_shipping'] ?? false) {
            $updates['is_default_shipping'] = true;
        }

        if ($updates !== []) {
            $address->update($updates);
            $this->syncDefaults($address->fresh());
        }
    }

    private function applyDefaultAlias(array $data, array $payload): array
    {
        if ((bool) ($payload['isDefault'] ?? false)) {
            $data['is_default_billing'] = true;
            $data['is_default_shipping'] = true;
        }

        return $data;
    }
}
