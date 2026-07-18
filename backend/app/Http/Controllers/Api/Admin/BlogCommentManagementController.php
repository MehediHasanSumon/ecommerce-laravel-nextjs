<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\BlogCommentResource;
use App\Http\Responses\ApiResponse;
use App\Models\BlogComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class BlogCommentManagementController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_blog', only: ['index']),
            new Middleware('permission:can_edit_blog', only: ['update']),
            new Middleware('permission:can_delete_blog', only: ['destroy']),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $comments = BlogComment::query()
            ->with('blog:id,title,slug')
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($validated['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('author_name', 'like', "%{$search}%")
                        ->orWhere('author_email', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate(10);

        return ApiResponse::success(
            ['comments' => BlogCommentResource::collection($comments)->resolve()],
            'Comments retrieved successfully.',
            200,
            ['pagination' => [
                'current_page' => $comments->currentPage(),
                'last_page' => $comments->lastPage(),
                'per_page' => $comments->perPage(),
                'total' => $comments->total(),
                'from' => $comments->firstItem(),
                'to' => $comments->lastItem(),
            ]]
        );
    }

    public function update(Request $request, BlogComment $comment): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
        ]);

        $comment->forceFill([
            'status' => $validated['status'],
            'approved_at' => $validated['status'] === 'approved' ? now() : null,
            'approved_by' => $validated['status'] === 'approved' ? $request->user()?->id : null,
        ])->save();

        return ApiResponse::success(['comment' => BlogCommentResource::make($comment)->resolve()], 'Comment updated successfully.');
    }

    public function destroy(BlogComment $comment): JsonResponse
    {
        $comment->delete();

        return ApiResponse::success([], 'Comment deleted successfully.');
    }
}
