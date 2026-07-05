<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkDeleteRequest;
use App\Http\Requests\Admin\ListPermissionsRequest;
use App\Http\Requests\Admin\StorePermissionRequest;
use App\Http\Requests\Admin\UpdatePermissionRequest;
use App\Http\Resources\Admin\PermissionResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\PermissionManagementService;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Permission;

class PermissionManagementController extends Controller
{
    public function __construct(private readonly PermissionManagementService $permissions) {}

    public function index(ListPermissionsRequest $request): JsonResponse
    {
        $permissions = $this->permissions->paginate($request->validated());

        return ApiResponse::success(
            ['permissions' => PermissionResource::collection($permissions)->resolve()],
            'Permissions retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($permissions)]
        );
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = $this->permissions->create($request->validated());

        return ApiResponse::success(['permission' => PermissionResource::make($permission)->resolve()], 'Permission created successfully.', 201);
    }

    public function show(Permission $permission): JsonResponse
    {
        return ApiResponse::success(['permission' => PermissionResource::make($permission)->resolve()]);
    }

    public function update(UpdatePermissionRequest $request, Permission $permission): JsonResponse
    {
        $permission = $this->permissions->update($permission, $request->validated());

        return ApiResponse::success(['permission' => PermissionResource::make($permission)->resolve()], 'Permission updated successfully.');
    }

    public function destroy(Permission $permission): JsonResponse
    {
        $this->permissions->delete($permission);

        return ApiResponse::success([], 'Permission deleted successfully.');
    }

    public function bulkDestroy(BulkDeleteRequest $request): JsonResponse
    {
        $deleted = $this->permissions->bulkDelete($request->validated('ids'));

        return ApiResponse::success(['deleted' => $deleted], 'Selected permissions deleted successfully.');
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
