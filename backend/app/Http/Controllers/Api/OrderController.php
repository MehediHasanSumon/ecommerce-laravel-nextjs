<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderDetailResource;
use App\Http\Resources\OrderResource;
use App\Http\Responses\ApiResponse;
use App\Services\Orders\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(private readonly OrderService $orders) {}

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
}
