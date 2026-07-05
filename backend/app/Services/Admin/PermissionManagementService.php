<?php

namespace App\Services\Admin;

use App\Services\Admin\Concerns\BuildsManagementQueries;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Spatie\Permission\Models\Permission;

class PermissionManagementService
{
    use BuildsManagementQueries;

    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Permission::query()
            ->when($filters['search'] ?? null, fn ($query, string $search) => $query->where('name', 'like', "%{$search}%"));

        $this->applyDateFilters($query, $filters);

        return $query
            ->orderBy($filters['sort'] ?? 'created_at', $filters['direction'] ?? 'desc')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function create(array $data): Permission
    {
        return Permission::query()->create(['name' => $data['name'], 'guard_name' => 'web']);
    }

    public function update(Permission $permission, array $data): Permission
    {
        $permission->update(['name' => $data['name']]);

        return $permission;
    }

    public function delete(Permission $permission): void
    {
        $permission->delete();
    }

    public function bulkDelete(array $ids): int
    {
        return Permission::query()->whereIn('id', $ids)->delete();
    }
}
