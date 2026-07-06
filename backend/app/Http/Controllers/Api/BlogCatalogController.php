<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListBlogsRequest;
use App\Http\Requests\StoreBlogCommentRequest;
use App\Http\Resources\BlogCardResource;
use App\Http\Resources\BlogCommentResource;
use App\Http\Resources\BlogDetailResource;
use App\Http\Responses\ApiResponse;
use App\Models\Blog;
use App\Services\BlogCatalogService;
use Illuminate\Http\JsonResponse;

class BlogCatalogController extends Controller
{
    public function __construct(private readonly BlogCatalogService $blogs) {}

    public function index(ListBlogsRequest $request): JsonResponse
    {
        $items = $this->blogs->paginate($request->validated());

        return ApiResponse::success(
            [
                'blogs' => BlogCardResource::collection($items)->resolve(),
                'settings' => $this->blogs->settings(),
            ],
            'Blogs retrieved successfully.',
            200,
            ['pagination' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
                'from' => $items->firstItem(),
                'to' => $items->lastItem(),
            ]]
        );
    }

    public function show(string $slug): JsonResponse
    {
        $blog = $this->blogs->show($slug);
        $settings = $this->blogs->settings();

        return ApiResponse::success([
            'blog' => BlogDetailResource::make($blog)->resolve(),
            'settings' => $settings,
            'related' => $settings['enable_related']
                ? BlogCardResource::collection($this->blogs->related($blog))->resolve()
                : [],
        ]);
    }

    public function home(): JsonResponse
    {
        return ApiResponse::success([
            'blogs' => BlogCardResource::collection($this->blogs->homeBlogs())->resolve(),
            'settings' => $this->blogs->settings(),
        ]);
    }

    public function storeComment(StoreBlogCommentRequest $request, Blog $blog): JsonResponse
    {
        $comment = $this->blogs->createComment($blog, $request->validated(), $request->user()?->id);

        return ApiResponse::success([
            'comment' => BlogCommentResource::make($comment)->resolve(),
        ], 'Comment submitted for moderation.', 201);
    }
}
