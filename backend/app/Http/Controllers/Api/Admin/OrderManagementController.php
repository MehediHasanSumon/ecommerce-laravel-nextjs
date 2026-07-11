<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderDetailResource;
use App\Http\Resources\OrderResource;
use App\Http\Responses\ApiResponse;
use App\Services\Orders\OrderService;
use App\Services\Pdf\OrderPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class OrderManagementController extends Controller
{
    public function __construct(
        private readonly OrderService $orders,
        private readonly OrderPdfService $pdf,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orders = $this->orders->paginate($request->query());

        return ApiResponse::success(
            [
                'orders' => OrderResource::collection($orders)->resolve(),
                'statuses' => [
                    'order' => OrderService::ORDER_STATUSES,
                    'payment' => OrderService::PAYMENT_STATUSES,
                    'shipping' => OrderService::SHIPPING_STATUSES,
                ],
            ],
            'Orders retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($orders)],
        );
    }

    public function show(Request $request, string $order): JsonResponse
    {
        $data = $request->validate([
            'timeline_page' => ['nullable', 'integer', 'min:1'],
            'timeline_per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        [$record, $timeline] = $this->orders->findAdminWithPaginatedTimeline(
            $order,
            (int) ($data['timeline_page'] ?? 1),
            (int) ($data['timeline_per_page'] ?? 5),
        );

        return ApiResponse::success(
            [
                'order' => OrderDetailResource::make($record)->resolve(),
                'statuses' => [
                    'order' => OrderService::ORDER_STATUSES,
                    'payment' => OrderService::PAYMENT_STATUSES,
                    'shipping' => OrderService::SHIPPING_STATUSES,
                ],
            ],
            'OK',
            200,
            ['timeline_pagination' => $this->paginationMeta($timeline)],
        );
    }

    public function update(Request $request, string $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string'],
            'payment_status' => ['nullable', 'string'],
            'shipping_status' => ['nullable', 'string'],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->orders->updateStatuses($this->orders->findAdmin($order), $data, $request->user()?->id);

        return ApiResponse::success(['order' => OrderDetailResource::make($updated)->resolve()], 'Order updated successfully.');
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required'],
            'status' => ['nullable', 'string'],
            'payment_status' => ['nullable', 'string'],
            'shipping_status' => ['nullable', 'string'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->orders->bulkUpdate($data['ids'], $data, $request->user()?->id);

        return ApiResponse::success(['updated' => $updated], 'Selected orders updated successfully.');
    }

    public function refund(Request $request, string $order): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->orders->refund(
            $this->orders->findAdmin($order),
            (int) round(((float) $data['amount']) * 100),
            $data['reason'],
            $data['note'] ?? null,
            $request->user()?->id,
        );

        return ApiResponse::success(['order' => OrderDetailResource::make($updated)->resolve()], 'Refund recorded successfully.');
    }

    public function shippingLog(Request $request, string $order): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string'],
            'courier' => ['nullable', 'string', 'max:120'],
            'tracking_number' => ['nullable', 'string', 'max:120'],
            'tracking_url' => ['nullable', 'url', 'max:500'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $updated = $this->orders->logShipment($this->orders->findAdmin($order), $data, $request->user()?->id);

        return ApiResponse::success(['order' => OrderDetailResource::make($updated)->resolve()], 'Shipping log added successfully.');
    }

    public function invoice(string $order): Response
    {
        return $this->pdf->invoice($this->orders->findAdmin($order));
    }

    public function deliverySlip(string $order): Response
    {
        return $this->pdf->deliverySlip($this->orders->findAdmin($order));
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
