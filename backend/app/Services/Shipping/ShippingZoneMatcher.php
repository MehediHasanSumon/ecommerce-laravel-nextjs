<?php

namespace App\Services\Shipping;

use App\Models\Settings\ShippingZone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class ShippingZoneMatcher
{
    public function activeQuery(): Builder
    {
        return ShippingZone::query()
            ->where('status', true)
            ->orderBy('display_order')
            ->orderBy('name');
    }

    public function findForCountry(?string $country): ?ShippingZone
    {
        $normalizedCountry = $this->normalize($country);

        return $this->activeQuery()
            ->with(['methods' => fn ($query) => $query->where('status', true)->orderBy('display_order')->orderBy('name')])
            ->get()
            ->first(fn (ShippingZone $zone): bool => $this->zoneMatchesCountry($zone, $normalizedCountry));
    }

    public function methodsForCountry(?string $country): Collection
    {
        $zone = $this->findForCountry($country);

        if (! $zone) {
            return collect();
        }

        return $zone->methods;
    }

    public function zoneMatchesCountry(ShippingZone $zone, ?string $country): bool
    {
        $countries = collect($zone->countries ?? [])
            ->map(fn ($value) => $this->normalize((string) $value))
            ->filter()
            ->values();

        if ($countries->isEmpty()) {
            return true;
        }

        if (! $country) {
            return false;
        }

        return $countries->contains($country);
    }

    private function normalize(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $normalized = mb_strtolower($value);

        return match ($normalized) {
            'bd', 'bgd' => 'bangladesh',
            'us', 'usa', 'united states of america' => 'united states',
            'uk', 'gb', 'gbr' => 'united kingdom',
            default => $normalized,
        };
    }
}
