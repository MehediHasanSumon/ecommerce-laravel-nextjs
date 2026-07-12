<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderDetailResource;
use App\Http\Resources\OrderResource;
use App\Http\Responses\ApiResponse;
use App\Models\Order;
use App\Services\Orders\OrderService;
use App\Services\Pdf\OrderPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_order', only: ['index', 'show', 'invoice']),
            new Middleware('permission:can_edit_order', only: ['cancel']),
        ];
    }

    public function __construct(
        private readonly OrderService $orders,
        private readonly OrderPdfService $pdf,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orders = $this->orders->paginate(
            $request->query(),
            $request->user()?->id,
            (string) $request->header('X-Guest-Token') ?: null,
        );

        return ApiResponse::success(
            ['orders' => OrderResource::collection($orders)->resolve()],
            'Orders retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($orders)],
        );
    }

    public function show(Request $request, string $order): JsonResponse
    {
        return ApiResponse::success([
            'order' => OrderDetailResource::make($this->orders->findVisible($order, $request))->resolve(),
        ]);
    }

    public function cancel(Request $request, string $order): JsonResponse
    {
        $visibleOrder = $this->orders->findVisible($order, $request);

        if (! $this->canCustomerCancel($visibleOrder)) {
            throw ValidationException::withMessages([
                'order' => ['This order can no longer be cancelled from your account.'],
            ]);
        }

        $this->orders->updateStatuses($visibleOrder, [
            'status' => 'cancelled',
            'payment_status' => 'cancelled',
            'shipping_status' => 'returned',
            'note' => 'Cancelled by customer.',
        ], $request->user()?->id);

        return ApiResponse::success([
            'order' => OrderDetailResource::make($this->orders->findVisible($order, $request))->resolve(),
        ], 'Order cancelled successfully.');
    }

    public function invoice(Request $request, string $order): Response
    {
        return $this->pdf->invoice($this->orders->findVisible($order, $request));
    }

    public function paymentInvoice(Request $request): Response
    {
        $orderNumber = (string) $request->query('order');
        abort_unless($orderNumber !== '', 404);

        return $this->pdf->paidInvoice($this->orders->findVisible($orderNumber, $request));
    }

    public function paymentResult(Request $request): JsonResponse
    {
        $orderNumber = (string) $request->query('order');
        abort_unless($orderNumber !== '', 404);

        return $this->show($request, $orderNumber);
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

    private function canCustomerCancel(Order $order): bool
    {
        return in_array($order->status, ['pending', 'confirmed'], true)
            && in_array($order->shipping_status ?? 'pending', ['pending'], true)
            && $order->payment_status !== 'paid';
    }
}
