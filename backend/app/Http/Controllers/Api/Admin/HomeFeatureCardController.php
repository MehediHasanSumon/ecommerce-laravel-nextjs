<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListHomeFeatureCardsRequest;
use App\Http\Requests\Admin\ReorderHomeFeatureCardsRequest;
use App\Http\Requests\Admin\SaveHomeFeatureCardRequest;
use App\Http\Resources\Admin\HomeFeatureCardResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\HomeFeatureCardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class HomeFeatureCardController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_home_feature_card_setting', only: ['index', 'show']),
            new Middleware('permission:can_create_home_feature_card_setting', only: ['store']),
            new Middleware('permission:can_edit_home_feature_card_setting', only: ['update', 'reorder']),
            new Middleware('permission:can_delete_home_feature_card_setting', only: ['destroy']),
        ];
    }

    public function __construct(private readonly HomeFeatureCardService $cards) {}

    public function index(ListHomeFeatureCardsRequest $request): JsonResponse
    {
        $records = $this->cards->paginate($request->validated());

        return ApiResponse::success(
            ['items' => HomeFeatureCardResource::collection($records)->resolve()],
            'Feature cards retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($records)]
        );
    }

    public function store(SaveHomeFeatureCardRequest $request): JsonResponse
    {
        $card = $this->cards->create($request->validated(), $request->user()?->id);

        return ApiResponse::success(['item' => HomeFeatureCardResource::make($card)->resolve()], 'Feature card created successfully.', 201);
    }

    public function show(int $id): JsonResponse
    {
        return ApiResponse::success(['item' => HomeFeatureCardResource::make($this->cards->find($id))->resolve()]);
    }

    public function update(SaveHomeFeatureCardRequest $request, int $id): JsonResponse
    {
        $card = $this->cards->update($id, $request->validated(), $request->user()?->id);

        return ApiResponse::success(['item' => HomeFeatureCardResource::make($card)->resolve()], 'Feature card updated successfully.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->cards->delete($id, request()->user()?->id);

        return ApiResponse::success([], 'Feature card deleted successfully.');
    }

    public function reorder(ReorderHomeFeatureCardsRequest $request): JsonResponse
    {
        $cards = $this->cards->reorder($request->validated('cards'), $request->user()?->id);

        return ApiResponse::success(
            ['items' => HomeFeatureCardResource::collection($cards)->resolve()],
            'Feature cards reordered successfully.'
        );
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
