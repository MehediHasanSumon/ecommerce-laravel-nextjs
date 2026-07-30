<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\CourierShipmentResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\CourierSettingsService;
use App\Services\Courier\CourierManager;
use App\Services\Courier\CourierShipmentService;
use App\Services\Orders\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class CourierShipmentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_courier_shipment', only: ['index', 'show']),
            new Middleware('permission:can_view_courier_shipment|can_create_courier_shipment', only: ['options']),
            new Middleware('permission:can_create_courier_shipment', only: ['store', 'bulkCreate', 'calculateCharge']),
            new Middleware('permission:can_edit_courier_shipment', only: ['sync', 'cancel', 'bulkSync']),
        ];
    }

    public function __construct(
        private readonly CourierShipmentService $shipments,
        private readonly CourierSettingsService $settings,
        private readonly CourierManager $manager,
        private readonly OrderService $orders,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'provider' => ['nullable', Rule::in(CourierSettingsService::PROVIDERS)],
            'status' => ['nullable', Rule::in(CourierShipmentService::STATUSES)],
            'cod_status' => ['nullable', Rule::in(CourierShipmentService::COD_STATUSES)],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'sort' => ['nullable', Rule::in(['merchant_order_id', 'provider', 'status', 'cod_status', 'delivery_charge_cents', 'shipment_created_at', 'last_synced_at', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $shipments = $this->shipments->paginate($filters);

        return ApiResponse::success([
            'shipments' => CourierShipmentResource::collection($shipments)->resolve(),
            'providers' => $this->settings->metadata(),
            'statuses' => CourierShipmentService::STATUSES,
            'cod_statuses' => CourierShipmentService::COD_STATUSES,
        ], meta: ['pagination' => $this->pagination($shipments)]);
    }

    public function show(string $shipment): JsonResponse
    {
        return ApiResponse::success([
            'shipment' => CourierShipmentResource::make($this->shipments->find($shipment))->resolve(),
        ]);
    }

    public function options(): JsonResponse
    {
        return ApiResponse::success([
            'providers' => $this->settings->enabled()->map(function ($setting): array {
                $provider = $this->manager->provider($setting->provider);

                return [
                    'provider' => $setting->provider,
                    'label' => $provider->label(),
                    'capabilities' => $provider->capabilities(),
                    'defaults' => [
                        'storeId' => $setting->default_store_id,
                        'parcelType' => $setting->default_parcel_type,
                        'itemDescription' => $setting->default_item_description,
                        'deliveryType' => $setting->default_delivery_type,
                        'paymentType' => $setting->default_payment_type,
                        'weight' => (float) $setting->default_weight,
                    ],
                ];
            })->values(),
        ]);
    }

    public function store(Request $request, string $order): JsonResponse
    {
        $data = $this->shipmentPayload($request);
        $shipment = $this->shipments->create(
            $this->orders->findAdmin($order),
            $data['provider'],
            $data,
            $request->user()?->id,
        );

        return ApiResponse::success([
            'shipment' => CourierShipmentResource::make($shipment)->resolve(),
        ], 'Courier shipment created successfully.', 201);
    }

    public function sync(Request $request, string $shipment): JsonResponse
    {
        $updated = $this->shipments->sync($this->shipments->find($shipment), $request->user()?->id);

        return ApiResponse::success(['shipment' => CourierShipmentResource::make($updated)->resolve()], 'Shipment status synchronized.');
    }

    public function cancel(Request $request, string $shipment): JsonResponse
    {
        $updated = $this->shipments->cancel($this->shipments->find($shipment), $request->user()?->id);

        return ApiResponse::success(['shipment' => CourierShipmentResource::make($updated)->resolve()], 'Shipment cancelled successfully.');
    }

    public function bulkCreate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_ids' => ['required', 'array', 'min:1', 'max:100'],
            'order_ids.*' => ['required'],
            'provider' => ['required', Rule::in(CourierSettingsService::PROVIDERS)],
            'options' => ['nullable', 'array'],
        ]);
        $queued = $this->shipments->dispatchBulkCreate($data['order_ids'], $data['provider'], $data['options'] ?? [], $request->user()?->id);

        return ApiResponse::success(['queued' => $queued], 'Courier shipment creation queued.');
    }

    public function bulkSync(Request $request): JsonResponse
    {
        $data = $request->validate([
            'shipment_ids' => ['required', 'array', 'min:1', 'max:200'],
            'shipment_ids.*' => ['required'],
        ]);
        $queued = $this->shipments->dispatchBulkSync($data['shipment_ids'], $request->user()?->id);

        return ApiResponse::success(['queued' => $queued], 'Courier shipment synchronization queued.');
    }

    public function calculateCharge(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => ['required', Rule::in(CourierSettingsService::PROVIDERS)],
            'store_id' => ['nullable', 'integer', 'min:1'],
            'item_type' => ['nullable', 'integer', 'min:1'],
            'delivery_type' => ['nullable', 'integer', 'min:1'],
            'item_weight' => ['required', 'numeric', 'min:0.1', 'max:100'],
            'recipient_city' => ['required', 'integer', 'min:1'],
            'recipient_zone' => ['required', 'integer', 'min:1'],
        ]);
        $setting = $this->settings->findEnabled($data['provider']);
        $provider = $this->manager->provider($data['provider']);
        if (! ($provider->capabilities()['charge'] ?? false)) {
            return ApiResponse::success([
                'available' => false,
                'charge' => null,
            ], 'Courier pricing is unavailable. Use the configured shipping method charge.');
        }

        return ApiResponse::success([
            'available' => true,
            'charge' => $provider->calculateCharge($setting, $data),
        ], 'Courier delivery charge calculated.');
    }

    private function shipmentPayload(Request $request): array
    {
        return $request->validate([
            'provider' => ['required', Rule::in(CourierSettingsService::PROVIDERS)],
            'weight' => ['nullable', 'numeric', 'min:0.1', 'max:100'],
            'amount_to_collect' => ['nullable', 'numeric', 'min:0'],
            'parcel_type' => ['nullable', 'string', 'max:60'],
            'delivery_type' => ['nullable', 'string', 'max:60'],
            'payment_type' => ['nullable', Rule::in(['cash_on_delivery', 'prepaid', 'outstanding'])],
            'item_description' => ['nullable', 'string', 'max:500'],
            'special_instruction' => ['nullable', 'string', 'max:500'],
            'store_id' => ['nullable', 'integer', 'min:1'],
            'city_id' => ['nullable', 'integer', 'min:1'],
            'zone_id' => ['nullable', 'integer', 'min:1'],
            'area_id' => ['nullable', 'integer', 'min:1'],
        ]);
    }

    private function pagination($paginator): array
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
