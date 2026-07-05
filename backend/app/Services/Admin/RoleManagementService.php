<?php

namespace App\Services\Admin;

use App\Services\Admin\Concerns\BuildsManagementQueries;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class RoleManagementService
{
    use BuildsManagementQueries;

    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Role::query()
            ->with('permissions:id,name')
            ->withCount('permissions')
            ->when($filters['search'] ?? null, fn ($query, string $search) => $query->where('name', 'like', "%{$search}%"));

        $this->applyDateFilters($query, $filters);

        return $query
            ->orderBy($filters['sort'] ?? 'created_at', $filters['direction'] ?? 'desc')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function create(array $data): Role
    {
        return DB::transaction(function () use ($data): Role {
            $role = Role::query()->create(['name' => $data['name'], 'guard_name' => 'web']);
            $role->syncPermissions($data['permissions'] ?? []);

            return $role->load('permissions:id,name')->loadCount('permissions');
        });
    }

    public function update(Role $role, array $data): Role
    {
        return DB::transaction(function () use ($role, $data): Role {
            $role->update(['name' => $data['name']]);
            $role->syncPermissions($data['permissions'] ?? []);

            return $role->load('permissions:id,name')->loadCount('permissions');
        });
    }

    public function delete(Role $role): void
    {
        $role->delete();
    }

    public function bulkDelete(array $ids): int
    {
        return Role::query()->whereIn('id', $ids)->delete();
    }
}
