<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
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

class ShippingMethodManagementController extends Controller
{
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
