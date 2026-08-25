<?php

namespace App\Services\Admin;

use App\Models\Customer;
use App\Support\CustomerPhoneNormalizer;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CustomerManagementService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $status = (string) ($filters['status'] ?? '');
        $sort = (string) ($filters['sort'] ?? 'created_at');
        $direction = ($filters['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $perPage = min(max((int) ($filters['per_page'] ?? 20), 1), 100);
        $page = max((int) ($filters['page'] ?? 1), 1);

        $query = Customer::query()
            ->withCount('orders');

        if ($search !== '') {
            $normalizedSearch = CustomerPhoneNormalizer::normalize($search);
            $query->where(function ($q) use ($search, $normalizedSearch) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");

                if ($normalizedSearch !== '' && $normalizedSearch !== $search) {
                    $q->orWhere('mobile', 'like', "%{$normalizedSearch}%");
                }
            });
        }

        if ($status !== '' && in_array($status, ['active', 'inactive'], true)) {
            $query->where('status', $status);
        }

        $allowedSorts = ['name', 'mobile', 'status', 'created_at', 'orders_count'];
        $sortColumn = in_array($sort, $allowedSorts, true) ? $sort : 'created_at';

        $query->orderBy($sortColumn, $direction)->orderBy('id', $direction);

        return $query->paginate($perPage, ['*'], 'page', $page)->withQueryString();
    }

    public function find(int|string $id): Customer
    {
        return Customer::query()->findOrFail((int) $id);
    }

    public function create(array $data): Customer
    {
        $data['mobile'] = CustomerPhoneNormalizer::normalize($data['mobile'] ?? '');
        if (isset($data['email'])) {
            $data['email'] = trim((string) $data['email']) ?: null;
        }

        return Customer::query()->create([
            'name' => trim((string) $data['name']),
            'mobile' => $data['mobile'],
            'email' => $data['email'] ?? null,
            'address' => isset($data['address']) ? trim((string) $data['address']) ?: null : null,
            'status' => $data['status'] ?? 'active',
        ]);
    }

    public function update(Customer $customer, array $data): Customer
    {
        if (isset($data['mobile'])) {
            $data['mobile'] = CustomerPhoneNormalizer::normalize($data['mobile']);
        }
        if (isset($data['email'])) {
            $data['email'] = trim((string) $data['email']) ?: null;
        }
        if (isset($data['name'])) {
            $data['name'] = trim((string) $data['name']);
        }
        if (isset($data['address'])) {
            $data['address'] = trim((string) $data['address']) ?: null;
        }

        $customer->update($data);

        return $customer->fresh();
    }

    public function delete(Customer $customer): void
    {
        $ordersCount = $customer->orders()->count();
        if ($ordersCount > 0) {
            throw ValidationException::withMessages([
                'customer' => ["Cannot delete customer '{$customer->name}' because they have {$ordersCount} associated order(s). You may set their status to Inactive instead."],
            ]);
        }

        $customer->delete();
    }
}
