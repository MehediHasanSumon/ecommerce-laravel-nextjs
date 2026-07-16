<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderRecordsRequest;
use App\Http\Requests\Admin\Shipping\ShippingBulkDeleteRequest;
use App\Http\Requests\Admin\Shipping\ShippingZoneIndexRequest;
use App\Http\Requests\Admin\Shipping\ShippingZoneRequest;
use App\Http\Resources\Admin\ShippingZoneResource;
use App\Http\Responses\ApiResponse;
use App\Models\Settings\ShippingZone;
use App\Services\Admin\ShippingManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class ShippingZoneController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_shipping_zone', only: ['index', 'show']),
            new Middleware('permission:can_create_shipping_zone', only: ['store']),
            new Middleware('permission:can_edit_shipping_zone', only: ['update', 'reorder']),
            new Middleware('permission:can_delete_shipping_zone', only: ['destroy', 'bulkDestroy']),
        ];
    }

    public function __construct(private readonly ShippingManagementService $shipping) {}

    public function index(ShippingZoneIndexRequest $request): JsonResponse
    {
        $zones = $this->shipping->zones($request->validated());

        return ApiResponse::success(
            ['zones' => ShippingZoneResource::collection($zones)->resolve()],
            'Shipping zones retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($zones)]
        );
    }

    public function store(ShippingZoneRequest $request): JsonResponse
    {
        $zone = $this->shipping->createZone($request->validated());

        return ApiResponse::success(['zone' => ShippingZoneResource::make($zone)->resolve()], 'Shipping zone created successfully.', 201);
    }

    public function show(ShippingZone $shippingZone): JsonResponse
    {
        return ApiResponse::success(['zone' => ShippingZoneResource::make($shippingZone->loadCount('methods'))->resolve()]);
    }

    public function update(ShippingZoneRequest $request, ShippingZone $shippingZone): JsonResponse
    {
        $zone = $this->shipping->updateZone($shippingZone, $request->validated());

        return ApiResponse::success(['zone' => ShippingZoneResource::make($zone)->resolve()], 'Shipping zone updated successfully.');
    }

    public function destroy(ShippingZone $shippingZone): JsonResponse
    {
        $this->shipping->deleteZone($shippingZone);

        return ApiResponse::success([], 'Shipping zone deleted successfully.');
    }

    public function bulkDestroy(ShippingBulkDeleteRequest $request): JsonResponse
    {
        $deleted = $this->shipping->bulkDeleteZones($request->validated('ids'));

        return ApiResponse::success(['deleted' => $deleted], 'Selected shipping zones deleted successfully.');
    }

    public function reorder(ReorderRecordsRequest $request): JsonResponse
    {
        $updated = $this->shipping->reorderZones($request->validated('items'));

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
