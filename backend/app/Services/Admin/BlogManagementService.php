<?php

namespace App\Services\Admin;

use App\Models\Blog;
use App\Services\Admin\Concerns\BuildsManagementQueries;
use App\Services\Admin\Settings\BlogSettingsService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BlogManagementService
{
    use BuildsManagementQueries;

    public function __construct(private readonly BlogSettingsService $settings) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = Blog::query()
            ->with('author:id,name,email')
            ->withCount(['comments as approved_comments_count' => fn ($query) => $query->where('status', 'approved')])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%")
                        ->orWhere('excerpt', 'like', "%{$search}%")
                        ->orWhere('content', 'like', "%{$search}%");
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when(($filters['featured'] ?? null) === 'yes', fn ($query) => $query->where('featured', true))
            ->when(($filters['featured'] ?? null) === 'no', fn ($query) => $query->where('featured', false));

        $this->applyDateFilters($query, $filters);

        return $query
            ->orderBy($filters['sort'] ?? 'created_at', $filters['direction'] ?? 'desc')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function create(array $data, int $userId): Blog
    {
        return DB::transaction(function () use ($data, $userId): Blog {
            $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['title']);
            $data['author_id'] = $data['author_id'] ?? $userId;
            $data['created_by'] = $userId;
            $data['updated_by'] = $userId;
            $data['reading_time_minutes'] = $this->readingTime($data['content']);
            $data = $this->normalizePublishDates($data);

            return Blog::query()->create($data)->load('author:id,name,email');
        });
    }

    public function update(Blog $blog, array $data, int $userId): Blog
    {
        return DB::transaction(function () use ($blog, $data, $userId): Blog {
            if (array_key_exists('slug', $data) || array_key_exists('title', $data)) {
                $data['slug'] = $this->uniqueSlug($data['slug'] ?? $data['title'], $blog->id);
            }

            if (array_key_exists('content', $data)) {
                $data['reading_time_minutes'] = $this->readingTime($data['content']);
            }

            $data['updated_by'] = $userId;
            $blog->fill($this->normalizePublishDates($data))->save();

            return $blog->refresh()->load('author:id,name,email');
        });
    }

    public function delete(Blog $blog): void
    {
        $blog->delete();
    }

    public function bulkDelete(array $ids): int
    {
        return Blog::query()->whereIn('id', $ids)->delete();
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: Str::random(8);
        $slug = $base;
        $suffix = 2;

        while (Blog::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->withTrashed()
            ->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function readingTime(string $content): int
    {
        $words = str_word_count(strip_tags($content));

        return max(1, (int) ceil($words / 200));
    }

    private function normalizePublishDates(array $data): array
    {
        if (($data['status'] ?? null) === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        if (($data['status'] ?? null) === 'scheduled') {
            $data['published_at'] = null;
        }

        return $data;
    }
}
