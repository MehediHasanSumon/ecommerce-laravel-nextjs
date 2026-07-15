<?php

namespace App\Services\Customers;

use App\Models\GuestCustomer;

class GuestCustomerService
{
    public function resolve(array $billingAddress, array $shippingAddress, ?string $notes = null): GuestCustomer
    {
        $email = $this->nullable($billingAddress['email'] ?? null);
        $phone = trim((string) ($billingAddress['phone'] ?? ''));

        $query = GuestCustomer::query()->where('phone', $phone);
        if ($email) {
            $query->where(fn ($query) => $query->whereNull('email')->orWhereRaw('lower(email) = ?', [mb_strtolower($email)]));
        }

        $guest = $query->latest('id')->first() ?? new GuestCustomer;
        $guest->fill([
            'name' => trim((string) ($billingAddress['full_name'] ?? 'Guest Customer')),
            'email' => $email,
            'phone' => $phone,
            'billing_address' => $billingAddress,
            'shipping_address' => $shippingAddress,
            'status' => 'active',
            'notes' => $notes ?: $guest->notes,
            'last_order_at' => now(),
        ])->save();

        return $guest;
    }

    private function nullable(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized !== '' ? mb_strtolower($normalized) : null;
    }
}
