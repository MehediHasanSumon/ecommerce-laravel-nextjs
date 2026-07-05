<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkDeleteRequest;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\Admin\RoleOptionResource;
use App\Http\Resources\Admin\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Services\Admin\UserManagementService;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function __construct(private readonly UserManagementService $users) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $users = $this->users->paginate($request->validated());

        return ApiResponse::success(
            [
                'users' => UserResource::collection($users)->resolve(),
                'roles' => RoleOptionResource::collection(Role::query()->orderBy('name')->get(['id', 'name']))->resolve(),
            ],
            'Users retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($users)]
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->users->create($request->validated());

        return ApiResponse::success(['user' => UserResource::make($user)->resolve()], 'User created successfully.', 201);
    }

    public function show(User $user): JsonResponse
    {
        return ApiResponse::success(['user' => UserResource::make($user->load('roles:id,name'))->resolve()]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user = $this->users->update($user, $request->validated());

        return ApiResponse::success(['user' => UserResource::make($user)->resolve()], 'User updated successfully.');
    }

    public function destroy(User $user): JsonResponse
    {
        $this->users->delete($user);

        return ApiResponse::success([], 'User deleted successfully.');
    }

    public function bulkDestroy(BulkDeleteRequest $request): JsonResponse
    {
        $deleted = $this->users->bulkDelete($request->validated('ids'));

        return ApiResponse::success(['deleted' => $deleted], 'Selected users deleted successfully.');
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
