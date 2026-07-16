<?php

namespace App\Services;

use App\Models\Blog;
use App\Models\BlogComment;
use App\Services\Admin\Settings\BlogSettingsService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BlogCatalogService
{
    public function __construct(private readonly BlogSettingsService $settings) {}

    public function settings(): array
    {
        return $this->settings->runtime();
    }

    public function ensureEnabled(): array
    {
        $settings = $this->settings();

        if (! $settings['enabled']) {
            throw new NotFoundHttpException;
        }

        return $settings;
    }

    public function paginate(array $filters): LengthAwarePaginator
    {
        $settings = $this->ensureEnabled();

        return Blog::query()
            ->published()
            ->with('author:id,name,email')
            ->when(($filters['search'] ?? null) && $settings['enable_search'], function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('excerpt', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%");
                });
            })
            ->when(($filters['sort'] ?? null) === 'oldest', fn ($query) => $query->orderBy('published_at'))
            ->when(($filters['sort'] ?? null) === 'most_viewed', fn ($query) => $query->orderByDesc('views_count'))
            ->when(! in_array($filters['sort'] ?? 'latest', ['oldest', 'most_viewed'], true), fn ($query) => $query->orderByDesc('published_at'))
            ->paginate(12);
    }

    public function show(string $slug): Blog
    {
        $this->ensureEnabled();

        $blog = Blog::query()
            ->published()
            ->with([
                'author:id,name,email',
                'approvedComments' => fn ($query) => $query->with('replies')->oldest(),
            ])
            ->where('slug', $slug)
            ->firstOrFail();

        $blog->increment('views_count');

        return $blog;
    }

    public function related(Blog $blog, int $limit = 3): Collection
    {
        return Blog::query()
            ->published()
            ->with('author:id,name,email')
            ->whereKeyNot($blog->id)
            ->latest('published_at')
            ->limit($limit)
            ->get();
    }

    public function homeBlogs(): Collection
    {
        $settings = $this->settings();

        if (! $settings['enabled'] || ! $settings['show_on_home']) {
            return new Collection;
        }

        return Blog::query()
            ->published()
            ->with('author:id,name,email')
            ->latest('published_at')
            ->limit($settings['home_limit'])
            ->get();
    }

    public function createComment(Blog $blog, array $data, ?int $userId = null): BlogComment
    {
        $settings = $this->ensureEnabled();
        $allowComments = $blog->allow_comments_override ?? $settings['allow_comments'];

        if (! $allowComments) {
            throw new NotFoundHttpException;
        }

        return $blog->comments()->create([
            'user_id' => $userId,
            'parent_id' => $data['parent_id'] ?? null,
            'author_name' => $data['author_name'],
            'author_email' => $data['author_email'],
            'content' => $data['content'],
            'status' => 'pending',
        ]);
    }
}
