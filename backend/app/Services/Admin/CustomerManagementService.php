<?php

namespace App\Services\Admin;

use App\Http\Resources\OrderResource;
use App\Models\GuestCustomer;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class CustomerManagementService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $status = (string) ($filters['status'] ?? '');
        $type = (string) ($filters['type'] ?? '');
        $sort = in_array($filters['sort'] ?? '', ['name', 'email', 'phone', 'total_orders', 'total_spending', 'last_order_at', 'status', 'created_at'], true)
            ? $filters['sort']
            : 'created_at';
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = min(max((int) ($filters['per_page'] ?? 20), 1), 100);
        $page = max((int) ($filters['page'] ?? 1), 1);

        $rows = collect();
        if ($type !== 'guest') {
            $rows = $rows->merge($this->registered($search, $status));
        }
        if ($type !== 'registered') {
            $rows = $rows->merge($this->guests($search, $status));
        }

        $rows = $rows->sortBy(
            fn (array $row) => $row[$sort] ?? null,
            SORT_REGULAR,
            $direction === 'desc',
        )->values();

        return new LengthAwarePaginator(
            $rows->forPage($page, $perPage)->values(),
            $rows->count(),
            $perPage,
            $page,
            ['path' => request()->url(), 'query' => request()->query()],
        );
    }

    public function find(string $customer): array
    {
        [$type, $id] = array_pad(explode('-', $customer, 2), 2, null);
        abort_unless(in_array($type, ['registered', 'guest'], true) && ctype_digit((string) $id), 404);

        return $type === 'registered'
            ? $this->registeredDetail((int) $id)
            : $this->guestDetail((int) $id);
    }

    public function updateGuest(GuestCustomer $guest, array $data): array
    {
        $guest->update($data);

        return $this->guestDetail($guest->id);
    }

    private function registered(string $search, string $status): Collection
    {
        return User::query()
            ->whereHas('roles', fn ($query) => $query->where('name', 'user'))
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->withCount('orders')
            ->withSum(['orders as orders_total_cents' => fn ($query) => $query->whereNotIn('status', ['cancelled', 'refunded'])], 'total_cents')
            ->withMax('orders as last_order_at', 'placed_at')
            ->get()
            ->map(fn (User $user): array => [
                'id' => "registered-{$user->id}",
                'record_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'type' => 'registered',
                'total_orders' => (int) $user->orders_count,
                'total_spending' => round(((int) $user->orders_total_cents) / 100, 2),
                'last_order_at' => $user->last_order_at,
                'status' => $user->status ?? 'active',
                'created_at' => optional($user->created_at)->toISOString(),
            ]);
    }

    private function guests(string $search, string $status): Collection
    {
        return GuestCustomer::query()
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->withCount('orders')
            ->withSum(['orders as orders_total_cents' => fn ($query) => $query->whereNotIn('status', ['cancelled', 'refunded'])], 'total_cents')
            ->get()
            ->map(fn (GuestCustomer $guest): array => [
                'id' => "guest-{$guest->id}",
                'record_id' => $guest->id,
                'name' => $guest->name,
                'email' => $guest->email,
                'phone' => $guest->phone,
                'type' => 'guest',
                'total_orders' => (int) $guest->orders_count,
                'total_spending' => round(((int) $guest->orders_total_cents) / 100, 2),
                'last_order_at' => optional($guest->last_order_at)->toISOString(),
                'status' => $guest->status,
                'created_at' => optional($guest->created_at)->toISOString(),
            ]);
    }

    private function registeredDetail(int $id): array
    {
        $user = User::query()
            ->whereHas('roles', fn ($query) => $query->where('name', 'user'))
            ->with([
                'addresses',
                'orders' => fn ($query) => $query
                    ->latest('placed_at')
                    ->withCount('items')
                    ->with(['user:id,name,email,phone', 'guestCustomer:id,name,email,phone']),
            ])
            ->findOrFail($id);

        return $this->detailPayload(
            "registered-{$user->id}",
            'registered',
            $user->name,
            $user->email,
            $user->phone,
            $user->status ?? 'active',
            $user->addresses->firstWhere('is_default_billing', true)?->toArray(),
            $user->addresses->firstWhere('is_default_shipping', true)?->toArray(),
            $user->orders,
            null,
            optional($user->created_at)->toISOString(),
        );
    }

    private function guestDetail(int $id): array
    {
        $guest = GuestCustomer::query()
            ->with([
                'orders' => fn ($query) => $query
                    ->latest('placed_at')
                    ->withCount('items')
                    ->with(['user:id,name,email,phone', 'guestCustomer:id,name,email,phone']),
            ])
            ->findOrFail($id);

        return $this->detailPayload(
            "guest-{$guest->id}",
            'guest',
            $guest->name,
            $guest->email,
            $guest->phone,
            $guest->status,
            $guest->billing_address,
            $guest->shipping_address,
            $guest->orders,
            $guest->notes,
            optional($guest->created_at)->toISOString(),
        );
    }

    private function detailPayload(
        string $id,
        string $type,
        string $name,
        ?string $email,
        ?string $phone,
        string $status,
        ?array $billing,
        ?array $shipping,
        Collection $orders,
        ?string $notes,
        ?string $createdAt,
    ): array {
        $validOrders = $orders->whereNotIn('status', ['cancelled', 'refunded']);

        return [
            'id' => $id,
            'type' => $type,
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'status' => $status,
            'billing_address' => $billing,
            'shipping_address' => $shipping,
            'notes' => $notes,
            'total_orders' => $orders->count(),
            'lifetime_spending' => round(((int) $validOrders->sum('total_cents')) / 100, 2),
            'last_order_at' => optional($orders->first()?->placed_at)->toISOString(),
            'created_at' => $createdAt,
            'orders' => OrderResource::collection($orders)->resolve(),
        ];
    }
}
