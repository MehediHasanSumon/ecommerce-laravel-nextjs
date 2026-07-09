<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ProductModuleBulkDeleteRequest;
use App\Http\Requests\Admin\ProductModuleListRequest;
use App\Http\Requests\Admin\ProductModuleSaveRequest;
use App\Http\Resources\Admin\ProductAdminResource;
use App\Http\Resources\Admin\ProductModuleResource;
use App\Http\Resources\Admin\ProductOptionResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\ProductModuleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductModuleController extends Controller
{
    public function __construct(private readonly ProductModuleService $modules) {}

    public function index(ProductModuleListRequest $request, string $module): JsonResponse
    {
        $records = $this->modules->paginate($module, $request->validated());

        return ApiResponse::success(
            [
                'items' => $this->resourceCollection($module, $records),
                'options' => $this->options($request),
            ],
            'Records retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($records)]
        );
    }

    public function store(ProductModuleSaveRequest $request, string $module): JsonResponse
    {
        $record = $this->modules->create($module, $request->validated());

        return ApiResponse::success(['item' => $this->resource($module, $record)], 'Record created successfully.', 201);
    }

    public function show(string $module, int $id): JsonResponse
    {
        return ApiResponse::success(['item' => $this->resource($module, $this->modules->find($module, $id))]);
    }

    public function update(ProductModuleSaveRequest $request, string $module, int $id): JsonResponse
    {
        $record = $this->modules->update($module, $id, $request->validated());

        return ApiResponse::success(['item' => $this->resource($module, $record)], 'Record updated successfully.');
    }

    public function destroy(string $module, int $id): JsonResponse
    {
        $this->modules->delete($module, $id);

        return ApiResponse::success([], 'Record deleted successfully.');
    }

    public function bulkDestroy(ProductModuleBulkDeleteRequest $request, string $module): JsonResponse
    {
        $deleted = $this->modules->bulkDelete($module, $request->validated('ids'));

        return ApiResponse::success(['deleted' => $deleted], 'Selected records deleted successfully.');
    }

    public function optionsOnly(Request $request): JsonResponse
    {
        return ApiResponse::success(['options' => $this->options($request)]);
    }

    private function resource(string $module, $record): array
    {
        return ($module === 'products'
            ? ProductAdminResource::make($record)
            : ProductModuleResource::make($record)
        )->resolve();
    }

    private function resourceCollection(string $module, $records): array
    {
        return ($module === 'products'
            ? ProductAdminResource::collection($records)
            : ProductModuleResource::collection($records)
        )->resolve();
    }

    private function options(?Request $request = null): array
    {
        return collect($this->modules->options([
            'attribute_search' => $request?->string('attribute_search')->toString(),
        ]))
            ->map(fn ($items) => ProductOptionResource::collection($items)->resolve())
            ->all();
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
