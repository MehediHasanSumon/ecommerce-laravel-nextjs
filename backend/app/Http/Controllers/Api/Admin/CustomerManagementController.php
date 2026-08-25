<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCustomerRequest;
use App\Http\Requests\Admin\UpdateCustomerRequest;
use App\Http\Resources\Admin\CustomerDetailResource;
use App\Http\Resources\Admin\CustomerResource;
use App\Http\Responses\ApiResponse;
use App\Models\Customer;
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
            new Middleware('permission:can_create_customer', only: ['store']),
            new Middleware('permission:can_edit_customer', only: ['update']),
            new Middleware('permission:can_delete_customer', only: ['destroy']),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'sort' => ['nullable', 'string', Rule::in(['name', 'mobile', 'status', 'created_at', 'orders_count'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $paginator = $this->customers->paginate($filters);

        return ApiResponse::success(
            ['customers' => CustomerResource::collection($paginator->items())],
            'Customers retrieved successfully.',
            200,
            ['pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ]],
        );
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = $this->customers->create($request->validated());

        return ApiResponse::success(
            ['customer' => CustomerResource::make($customer)],
            'Customer created successfully.',
            201,
        );
    }

    public function show(Customer $customer): JsonResponse
    {
        return ApiResponse::success(
            ['customer' => CustomerDetailResource::make($customer)],
            'Customer details retrieved successfully.',
        );
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $updated = $this->customers->update($customer, $request->validated());

        return ApiResponse::success(
            ['customer' => CustomerResource::make($updated)],
            'Customer updated successfully.',
        );
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->customers->delete($customer);

        return ApiResponse::success(
            [],
            'Customer deleted successfully.',
        );
    }
}
