<?php

namespace App\Services\Admin;

use App\Http\Resources\OrderResource;
use App\Models\GuestCustomer;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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

        $queries = [];
        if ($type !== 'guest') {
            $queries[] = $this->registeredQuery($search, $status);
        }
        if ($type !== 'registered') {
            $queries[] = $this->guestQuery($search, $status);
        }

        $union = array_shift($queries);
        foreach ($queries as $query) {
            $union->unionAll($query);
        }

        $sortColumn = $sort === 'total_spending' ? 'total_spending_cents' : $sort;
        $paginator = DB::query()
            ->fromSub($union, 'customers')
            ->orderBy($sortColumn, $direction)
            ->orderBy('record_id', $direction)
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        $paginator->setCollection($paginator->getCollection()->map(fn ($row): array => [
            'id' => "{$row->type}-{$row->record_id}",
            'record_id' => (int) $row->record_id,
            'name' => $row->name,
            'email' => $row->email,
            'phone' => $row->phone,
            'type' => $row->type,
            'total_orders' => (int) $row->total_orders,
            'total_spending' => round(((int) $row->total_spending_cents) / 100, 2),
            'last_order_at' => $row->last_order_at,
            'status' => $row->status,
            'created_at' => $row->created_at,
        ]));

        return $paginator;
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

    private function registeredQuery(string $search, string $status)
    {
        return DB::table('users')
            ->leftJoin('orders', fn ($join) => $join
                ->on('orders.user_id', '=', 'users.id')
                ->whereNull('orders.deleted_at'))
            ->whereNull('users.deleted_at')
            ->whereExists(fn ($query) => $query
                ->selectRaw('1')
                ->from('model_has_roles')
                ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
                ->whereColumn('model_has_roles.model_id', 'users.id')
                ->where('model_has_roles.model_type', User::class)
                ->where('roles.name', 'user'))
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('users.name', 'like', "%{$search}%")
                ->orWhere('users.email', 'like', "%{$search}%")
                ->orWhere('users.phone', 'like', "%{$search}%")))
            ->when($status !== '', fn ($query) => $query->where('users.status', $status))
            ->groupBy('users.id', 'users.name', 'users.email', 'users.phone', 'users.status', 'users.created_at')
            ->selectRaw("users.id as record_id, users.name, users.email, users.phone, 'registered' as type")
            ->selectRaw('COUNT(orders.id) as total_orders')
            ->selectRaw("COALESCE(SUM(CASE WHEN orders.status NOT IN ('cancelled', 'refunded') THEN orders.total_cents ELSE 0 END), 0) as total_spending_cents")
            ->selectRaw('MAX(orders.placed_at) as last_order_at')
            ->selectRaw("COALESCE(users.status, 'active') as status, users.created_at");
    }

    private function guestQuery(string $search, string $status)
    {
        return DB::table('guest_customers')
            ->leftJoin('orders', fn ($join) => $join
                ->on('orders.guest_customer_id', '=', 'guest_customers.id')
                ->whereNull('orders.deleted_at'))
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('guest_customers.name', 'like', "%{$search}%")
                ->orWhere('guest_customers.email', 'like', "%{$search}%")
                ->orWhere('guest_customers.phone', 'like', "%{$search}%")))
            ->when($status !== '', fn ($query) => $query->where('guest_customers.status', $status))
            ->groupBy('guest_customers.id', 'guest_customers.name', 'guest_customers.email', 'guest_customers.phone', 'guest_customers.status', 'guest_customers.created_at')
            ->selectRaw("guest_customers.id as record_id, guest_customers.name, guest_customers.email, guest_customers.phone, 'guest' as type")
            ->selectRaw('COUNT(orders.id) as total_orders')
            ->selectRaw("COALESCE(SUM(CASE WHEN orders.status NOT IN ('cancelled', 'refunded') THEN orders.total_cents ELSE 0 END), 0) as total_spending_cents")
            ->selectRaw('MAX(orders.placed_at) as last_order_at')
            ->selectRaw('guest_customers.status, guest_customers.created_at');
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
