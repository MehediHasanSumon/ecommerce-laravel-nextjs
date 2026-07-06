<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\BulkDeleteRequest;
use App\Http\Requests\Admin\ListBlogsRequest;
use App\Http\Requests\Admin\SaveBlogRequest;
use App\Http\Resources\Admin\BlogResource;
use App\Http\Resources\Admin\UserResource;
use App\Http\Responses\ApiResponse;
use App\Models\Blog;
use App\Models\User;
use App\Services\Admin\BlogManagementService;
use Illuminate\Http\JsonResponse;

class BlogManagementController extends Controller
{
    public function __construct(private readonly BlogManagementService $blogs) {}

    public function index(ListBlogsRequest $request): JsonResponse
    {
        $blogs = $this->blogs->paginate($request->validated());
        $authors = User::query()->orderBy('name')->get(['id', 'name', 'email', 'status']);

        return ApiResponse::success(
            [
                'blogs' => BlogResource::collection($blogs)->resolve(),
                'authors' => UserResource::collection($authors)->resolve(),
            ],
            'Blogs retrieved successfully.',
            200,
            ['pagination' => $this->paginationMeta($blogs)]
        );
    }

    public function store(SaveBlogRequest $request): JsonResponse
    {
        $blog = $this->blogs->create($request->validated(), $request->user()->id);

        return ApiResponse::success(['blog' => BlogResource::make($blog)->resolve()], 'Blog created successfully.', 201);
    }

    public function show(Blog $blog): JsonResponse
    {
        return ApiResponse::success(['blog' => BlogResource::make($blog->load('author:id,name,email'))->resolve()]);
    }

    public function update(SaveBlogRequest $request, Blog $blog): JsonResponse
    {
        $blog = $this->blogs->update($blog, $request->validated(), $request->user()->id);

        return ApiResponse::success(['blog' => BlogResource::make($blog)->resolve()], 'Blog updated successfully.');
    }

    public function destroy(Blog $blog): JsonResponse
    {
        $this->blogs->delete($blog);

        return ApiResponse::success([], 'Blog deleted successfully.');
    }

    public function bulkDestroy(BulkDeleteRequest $request): JsonResponse
    {
        $deleted = $this->blogs->bulkDelete($request->validated('ids'));

        return ApiResponse::success(['deleted' => $deleted], 'Selected blogs deleted successfully.');
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
