<?php

namespace App\Services\Admin;

use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingZone;
use App\Services\Admin\Concerns\BuildsManagementQueries;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ShippingManagementService
{
    use BuildsManagementQueries;

    public function zones(array $filters): LengthAwarePaginator
    {
        $query = ShippingZone::query()
            ->withCount('methods')
            ->when($filters['search'] ?? null, fn ($query, string $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status === 'active'));

        $this->applyDateFilters($query, $filters);

        return $query
            ->orderBy($filters['sort'] ?? 'created_at', $filters['direction'] ?? 'desc')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function methods(array $filters): LengthAwarePaginator
    {
        $query = ShippingMethod::query()
            ->with('zone:id,name')
            ->when($filters['search'] ?? null, fn ($query, string $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status === 'active'))
            ->when($filters['shipping_zone_id'] ?? null, fn ($query, int $zoneId) => $query->where('shipping_zone_id', $zoneId));

        $this->applyDateFilters($query, $filters);

        return $query
            ->orderBy($filters['sort'] ?? 'created_at', $filters['direction'] ?? 'desc')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function createZone(array $data): ShippingZone
    {
        $zone = ShippingZone::query()->create($this->zonePayload($data));
        $this->clearRuntimeCache();

        return $zone->loadCount('methods');
    }

    public function updateZone(ShippingZone $zone, array $data): ShippingZone
    {
        $zone->update($this->zonePayload($data));
        $this->clearRuntimeCache();

        return $zone->refresh()->loadCount('methods');
    }

    public function deleteZone(ShippingZone $zone): void
    {
        $zone->delete();
        $this->clearRuntimeCache();
    }

    public function bulkDeleteZones(array $ids): int
    {
        $deleted = ShippingZone::query()->whereIn('id', $ids)->delete();
        $this->clearRuntimeCache();

        return $deleted;
    }

    public function createMethod(array $data): ShippingMethod
    {
        $method = ShippingMethod::query()->create($this->methodPayload($data));
        $this->clearRuntimeCache();

        return $method->load('zone:id,name');
    }

    public function updateMethod(ShippingMethod $method, array $data): ShippingMethod
    {
        $method->update($this->methodPayload($data, $method));
        $this->clearRuntimeCache();

        return $method->refresh()->load('zone:id,name');
    }

    public function deleteMethod(ShippingMethod $method): void
    {
        $method->delete();
        $this->clearRuntimeCache();
    }

    public function bulkDeleteMethods(array $ids): int
    {
        $deleted = ShippingMethod::query()->whereIn('id', $ids)->delete();
        $this->clearRuntimeCache();

        return $deleted;
    }

    private function zonePayload(array $data): array
    {
        return [
            'name' => $data['name'],
            'countries' => array_values($data['countries'] ?? []),
            'description' => $data['description'] ?? null,
            'status' => (bool) $data['status'],
            'display_order' => (int) ($data['display_order'] ?? 0),
        ];
    }

    private function methodPayload(array $data, ?ShippingMethod $method = null): array
    {
        $freeShipping = (bool) $data['free_shipping'];
        $name = $data['name'];
        $slug = $method?->slug ?: $this->uniqueMethodSlug(Str::slug($name));
        $code = $method?->code ?: $this->uniqueMethodCode($slug);

        return [
            'shipping_zone_id' => $data['shipping_zone_id'],
            'name' => $name,
            'slug' => $slug,
            'code' => $code,
            'description' => $data['description'] ?? null,
            'type' => $freeShipping ? 'free_shipping' : 'flat_rate',
            'delivery_type' => $freeShipping ? 'free_shipping' : ($data['delivery_type'] ?? 'flat_rate'),
            'estimated_delivery_time' => $data['delivery_time'] ?? null,
            'rate_cents' => $freeShipping ? 0 : (int) round(((float) $data['shipping_cost']) * 100),
            'minimum_order_amount_cents' => (int) round(((float) ($data['minimum_order_amount'] ?? 0)) * 100),
            'status' => (bool) $data['status'],
            'display_order' => (int) ($data['display_order'] ?? 0),
        ];
    }

    private function uniqueMethodCode(string $base): string
    {
        $base = $base ?: 'shipping-method';
        $code = $base;
        $index = 2;

        while (ShippingMethod::query()->where('code', $code)->exists()) {
            $code = "{$base}-{$index}";
            $index++;
        }

        return $code;
    }

    private function uniqueMethodSlug(string $base): string
    {
        $base = $base ?: 'shipping-method';
        $slug = $base;
        $index = 2;

        while (ShippingMethod::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$index}";
            $index++;
        }

        return $slug;
    }

    private function clearRuntimeCache(): void
    {
        Cache::forget('settings.navigation.runtime');
    }
}
