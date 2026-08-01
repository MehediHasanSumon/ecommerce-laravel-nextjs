<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\GuestCustomer;
use App\Services\Admin\CustomerManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class CustomerManagementController extends Controller implements HasMiddleware
{
    public function __construct(private readonly CustomerManagementService $customers) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_customer', only: ['index', 'show']),
            new Middleware('permission:can_edit_customer', only: ['update']),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'type' => ['nullable', Rule::in(['registered', 'guest'])],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'blocked'])],
            'fraud_status' => ['nullable', Rule::in(['safe', 'low', 'medium', 'high', 'critical'])],
            'fraud_checked' => ['nullable', Rule::in(['checked', 'unchecked'])],
            'fraud_provider' => ['nullable', Rule::in(['fraudpeek', 'fraud_bd', 'fraudbd'])],
            'sort' => ['nullable', 'string'],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $customers = $this->customers->paginate($filters);

        return ApiResponse::success(
            ['customers' => $customers->items()],
            'Customers retrieved successfully.',
            200,
            ['pagination' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
                'from' => $customers->firstItem(),
                'to' => $customers->lastItem(),
            ]],
        );
    }

    public function show(string $customer): JsonResponse
    {
        return ApiResponse::success(['customer' => $this->customers->find($customer)]);
    }

    public function update(Request $request, GuestCustomer $guestCustomer): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'blocked'])],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        return ApiResponse::success(
            ['customer' => $this->customers->updateGuest($guestCustomer, $data)],
            'Guest customer updated successfully.',
        );
    }
}
