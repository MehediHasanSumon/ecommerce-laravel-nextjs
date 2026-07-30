<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkIpBlockRequest;
use App\Http\Requests\Admin\ListIpBlocksRequest;
use App\Http\Requests\Admin\StoreIpBlockRequest;
use App\Http\Requests\Admin\UpdateIpBlockRequest;
use App\Http\Resources\Admin\IpBlockResource;
use App\Http\Responses\ApiResponse;
use App\Models\IpBlock;
use App\Services\Admin\IpBlockManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class IpBlockManagementController extends Controller implements HasMiddleware
{
    public function __construct(private readonly IpBlockManagementService $blocks) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:can-view-ip-block', only: ['index', 'show', 'analytics']),
            new Middleware('permission:can-create-ip-block', only: ['store']),
            new Middleware('permission:can-update-ip-block', only: ['update', 'bulk', 'bulkUnblock']),
            new Middleware('permission:can-delete-ip-block', only: ['destroy', 'bulk', 'deleteExpired']),
        ];
    }

    public function index(ListIpBlocksRequest $request): JsonResponse
    {
        $blocks = $this->blocks->paginate($request->validated());

        return ApiResponse::success(
            ['ip_blocks' => IpBlockResource::collection($blocks)->resolve()],
            'IP blocks retrieved successfully.',
            meta: ['pagination' => [
                'current_page' => $blocks->currentPage(),
                'last_page' => $blocks->lastPage(),
                'per_page' => $blocks->perPage(),
                'total' => $blocks->total(),
                'from' => $blocks->firstItem(),
                'to' => $blocks->lastItem(),
            ]],
        );
    }

    public function store(StoreIpBlockRequest $request): JsonResponse
    {
        $block = $this->blocks->create($request->validated(), $request->user(), $request);

        return ApiResponse::success(['ip_block' => IpBlockResource::make($block)->resolve()], 'IP address blocked successfully.', 201);
    }

    public function show(IpBlock $ipBlock): JsonResponse
    {
        $ipBlock->load([
            'creator:id,name,email',
            'updater:id,name,email',
            'events' => fn ($query) => $query->latest('occurred_at')->limit(200),
        ]);

        return ApiResponse::success(['ip_block' => IpBlockResource::make($ipBlock)->resolve()]);
    }

    public function update(UpdateIpBlockRequest $request, IpBlock $ipBlock): JsonResponse
    {
        $block = $this->blocks->update($ipBlock, $request->validated(), $request->user(), $request);

        return ApiResponse::success(['ip_block' => IpBlockResource::make($block)->resolve()], 'IP block updated successfully.');
    }

    public function destroy(Request $request, IpBlock $ipBlock): JsonResponse
    {
        $this->blocks->delete($ipBlock, $request->user(), $request);

        return ApiResponse::success([], 'IP block deleted successfully.');
    }

    public function bulk(BulkIpBlockRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $processed = $this->blocks->bulk(
            $validated['ids'],
            $validated['action'],
            $request->user(),
            $validated,
            $request,
        );

        return ApiResponse::success(['processed' => $processed], 'Bulk action completed successfully.');
    }

    public function deleteExpired(Request $request): JsonResponse
    {
        $deleted = $this->blocks->deleteExpired($request->user(), $request);

        return ApiResponse::success(['deleted' => $deleted], 'Expired IP blocks deleted successfully.');
    }

    public function bulkUnblock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:1000'],
            'ids.*' => ['integer', 'distinct', 'exists:ip_blocks,id'],
        ]);
        $processed = $this->blocks->bulk($validated['ids'], 'unblock', $request->user(), request: $request);

        return ApiResponse::success(['processed' => $processed], 'Selected IP addresses unblocked successfully.');
    }

    public function analytics(): JsonResponse
    {
        return ApiResponse::success(['analytics' => $this->blocks->analytics()]);
    }
}
