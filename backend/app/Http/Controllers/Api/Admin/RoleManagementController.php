<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkDeleteRequest;
use App\Http\Requests\Admin\ListRolesRequest;
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use App\Http\Resources\Admin\PermissionOptionResource;
use App\Http\Resources\Admin\RoleResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\RoleManagementService;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleManagementController extends Controller
{
    public function __construct(private readonly RoleManagementService $roles) {}

    public function index(ListRolesRequest $request): JsonResponse
    {
        $roles = $this->roles->paginate($request->validated());

        return ApiResponse::success(
            [
                'roles' => RoleResource::collection($roles)->resolve(),
                'permissions' => PermissionOptionResource::collection(Permission::query()->orderBy('name')->get(['id', 'name']))->resolve(),
            ],
            'Roles retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($roles)]
        );
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->roles->create($request->validated());

        return ApiResponse::success(['role' => RoleResource::make($role)->resolve()], 'Role created successfully.', 201);
    }

    public function show(Role $role): JsonResponse
    {
        return ApiResponse::success(['role' => RoleResource::make($role->load('permissions:id,name')->loadCount('permissions'))->resolve()]);
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $role = $this->roles->update($role, $request->validated());

        return ApiResponse::success(['role' => RoleResource::make($role)->resolve()], 'Role updated successfully.');
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->roles->delete($role);

        return ApiResponse::success([], 'Role deleted successfully.');
    }

    public function bulkDestroy(BulkDeleteRequest $request): JsonResponse
    {
        $deleted = $this->roles->bulkDelete($request->validated('ids'));

        return ApiResponse::success(['deleted' => $deleted], 'Selected roles deleted successfully.');
    }

    private function paginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }
}
