<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomerAddressRequest;
use App\Http\Resources\CustomerAddressResource;
use App\Http\Responses\ApiResponse;
use App\Models\CustomerAddress;
use App\Services\Checkout\CustomerAddressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CustomerAddressController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_address', only: ['index']),
            new Middleware('permission:can_create_address', only: ['store']),
            new Middleware('permission:can_edit_address', only: ['update']),
            new Middleware('permission:can_delete_address', only: ['destroy']),
        ];
    }

    public function __construct(private readonly CustomerAddressService $addresses) {}

    public function index(Request $request): JsonResponse
    {
        $items = CustomerAddress::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('is_default_shipping')
            ->orderByDesc('is_default_billing')
            ->latest()
            ->get();

        return ApiResponse::success(['items' => CustomerAddressResource::collection($items)->resolve()]);
    }

    public function store(CustomerAddressRequest $request): JsonResponse
    {
        return ApiResponse::success([
            'address' => CustomerAddressResource::make($this->addresses->create($request->user(), $request->validated()))->resolve(),
        ], 'Address saved.', 201);
    }

    public function update(CustomerAddressRequest $request, CustomerAddress $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403);

        return ApiResponse::success([
            'address' => CustomerAddressResource::make($this->addresses->update($address, $request->validated()))->resolve(),
        ], 'Address updated.');
    }

    public function destroy(Request $request, CustomerAddress $address): JsonResponse
    {
        abort_unless($address->user_id === $request->user()->id, 403);
        $this->addresses->delete($address);

        return ApiResponse::success([], 'Address deleted.');
    }
}
