<?php

namespace App\Services\Admin;

use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingZone;
use App\Services\Admin\Concerns\BuildsManagementQueries;
use App\Support\Identifiers\SlugGenerator;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

    public function reorderZones(array $items): int
    {
        return $this->reorder(ShippingZone::class, $items, 'shipping_zones');
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

    public function reorderMethods(array $items): int
    {
        return $this->reorder(ShippingMethod::class, $items, 'shipping_methods');
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
        $slug = $method?->slug ?: SlugGenerator::generate($name, ShippingMethod::class);
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

    private function clearRuntimeCache(): void
    {
        Cache::forget('navigation.public.runtime');
    }

    private function reorder(string $class, array $items, string $type): int
    {
        $ids = collect($items)->pluck('id')->map(fn ($id) => (int) $id)->values();
        $orders = collect($items)
            ->mapWithKeys(fn ($item): array => [(int) $item['id'] => (int) $item['sort_order']])
            ->all();

        return DB::transaction(function () use ($class, $ids, $orders, $type): int {
            $records = $class::query()
                ->whereIn('id', $ids)
                ->lockForUpdate()
                ->get(['id', 'display_order']);

            abort_if($records->count() !== $ids->count(), 422, 'One or more records are invalid.');

            $updated = 0;
            foreach ($records as $record) {
                $next = $orders[(int) $record->id];
                if ((int) $record->display_order === $next) {
                    continue;
                }

                $record->forceFill(['display_order' => $next])->save();
                $updated++;
            }

            $updated += $this->normalizeOrder($class);

            Log::info('Admin shipping records reordered.', [
                'type' => $type,
                'updated' => $updated,
                'user_id' => auth()->id(),
            ]);

            $this->clearRuntimeCache();

            return $updated;
        });
    }

    private function normalizeOrder(string $class): int
    {
        $updated = 0;

        $class::query()
            ->orderBy('display_order')
            ->orderBy('id')
            ->get(['id', 'display_order'])
            ->values()
            ->each(function ($record, int $index) use (&$updated): void {
                if ((int) $record->display_order === $index) {
                    return;
                }

                $record->forceFill(['display_order' => $index])->save();
                $updated++;
            });

        return $updated;
    }
}
