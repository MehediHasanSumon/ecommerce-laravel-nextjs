<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderRecordsRequest;
use App\Http\Requests\Admin\Shipping\ShippingBulkDeleteRequest;
use App\Http\Requests\Admin\Shipping\ShippingMethodIndexRequest;
use App\Http\Requests\Admin\Shipping\ShippingMethodRequest;
use App\Http\Resources\Admin\ShippingMethodAdminResource;
use App\Http\Resources\Admin\ShippingZoneResource;
use App\Http\Responses\ApiResponse;
use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingZone;
use App\Services\Admin\ShippingManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ShippingMethodManagementController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_shipping_method', only: ['index', 'show']),
            new Middleware('permission:can_create_shipping_method', only: ['store']),
            new Middleware('permission:can_edit_shipping_method', only: ['update', 'reorder']),
            new Middleware('permission:can_delete_shipping_method', only: ['destroy', 'bulkDestroy']),
        ];
    }

    public function __construct(private readonly ShippingManagementService $shipping) {}

    public function index(ShippingMethodIndexRequest $request): JsonResponse
    {
        $methods = $this->shipping->methods($request->validated());
        $zones = ShippingZone::query()->where('status', true)->orderBy('name')->get();

        return ApiResponse::success(
            [
                'methods' => ShippingMethodAdminResource::collection($methods)->resolve(),
                'zones' => ShippingZoneResource::collection($zones->loadCount('methods'))->resolve(),
            ],
            'Shipping methods retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($methods)]
        );
    }

    public function store(ShippingMethodRequest $request): JsonResponse
    {
        $method = $this->shipping->createMethod($request->validated());

        return ApiResponse::success(['method' => ShippingMethodAdminResource::make($method)->resolve()], 'Shipping method created successfully.', 201);
    }

    public function show(ShippingMethod $shippingMethod): JsonResponse
    {
        return ApiResponse::success(['method' => ShippingMethodAdminResource::make($shippingMethod->load('zone:id,name'))->resolve()]);
    }

    public function update(ShippingMethodRequest $request, ShippingMethod $shippingMethod): JsonResponse
    {
        $method = $this->shipping->updateMethod($shippingMethod, $request->validated());

        return ApiResponse::success(['method' => ShippingMethodAdminResource::make($method)->resolve()], 'Shipping method updated successfully.');
    }

    public function destroy(ShippingMethod $shippingMethod): JsonResponse
    {
        $this->shipping->deleteMethod($shippingMethod);

        return ApiResponse::success([], 'Shipping method deleted successfully.');
    }

    public function bulkDestroy(ShippingBulkDeleteRequest $request): JsonResponse
    {
        $deleted = $this->shipping->bulkDeleteMethods($request->validated('ids'));

        return ApiResponse::success(['deleted' => $deleted], 'Selected shipping methods deleted successfully.');
    }

    public function reorder(ReorderRecordsRequest $request): JsonResponse
    {
        $updated = $this->shipping->reorderMethods($request->validated('items'));

        return ApiResponse::success(['updated' => $updated], 'Order saved successfully.');
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
