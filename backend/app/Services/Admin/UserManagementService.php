<?php

namespace App\Services\Admin;

use App\Models\User;
use App\Services\Admin\Concerns\BuildsManagementQueries;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserManagementService
{
    use BuildsManagementQueries;

    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = User::query()
            ->with('roles:id,name')
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['role'] ?? null, fn ($query, string $role) => $query->role($role))
            ->when(($filters['email_verified'] ?? null) === 'yes', fn ($query) => $query->whereNotNull('email_verified_at'))
            ->when(($filters['email_verified'] ?? null) === 'no', fn ($query) => $query->whereNull('email_verified_at'));

        $this->applyDateFilters($query, $filters);

        return $query
            ->orderBy($filters['sort'] ?? 'created_at', $filters['direction'] ?? 'desc')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function create(array $data): User
    {
        return DB::transaction(function () use ($data): User {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'status' => $data['status'],
                'email_verified_at' => $data['email_verified_at'] ?? null,
            ]);

            $user->syncRoles($data['roles'] ?? []);
            DB::afterCommit(fn () => app(AdminNavigationService::class)->invalidate());

            return $user->load('roles:id,name');
        });
    }

    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data): User {
            $user->fill([
                'name' => $data['name'],
                'email' => $data['email'],
                'status' => $data['status'],
                'email_verified_at' => $data['email_verified_at'] ?? null,
            ]);

            if (! empty($data['password'])) {
                $user->password = Hash::make($data['password']);
            }

            $user->save();
            $user->syncRoles($data['roles'] ?? []);
            DB::afterCommit(fn () => app(AdminNavigationService::class)->invalidate());

            return $user->load('roles:id,name');
        });
    }

    public function delete(User $user): void
    {
        $user->delete();
    }

    public function bulkDelete(array $ids): int
    {
        return User::query()->whereIn('id', $ids)->delete();
    }
}
