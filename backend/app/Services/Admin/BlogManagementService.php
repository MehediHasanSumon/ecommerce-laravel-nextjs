<?php

namespace App\Services\Admin;

use App\Models\Blog;
use App\Services\Admin\Concerns\BuildsManagementQueries;
use App\Services\Admin\Settings\BlogSettingsService;
use App\Services\Concerns\StoresPublicUploads;
use App\Services\Seo\SeoMetadataService;
use App\Support\Identifiers\SlugGenerator;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class BlogManagementService
{
    use BuildsManagementQueries;
    use StoresPublicUploads;

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
            $data['slug'] = SlugGenerator::generate($data['title'], Blog::class);
            $data['author_id'] = $data['author_id'] ?? $userId;
            $data['created_by'] = $userId;
            $data['updated_by'] = $userId;
            $data['reading_time_minutes'] = $this->readingTime($data['content']);
            $this->storeFeaturedImage($data);
            $data = $this->normalizePublishDates($data);

            $blog = Blog::query()->create($data)->load('author:id,name,email');
            SeoMetadataService::invalidateCache();

            return $blog;
        });
    }

    public function update(Blog $blog, array $data, int $userId): Blog
    {
        return DB::transaction(function () use ($blog, $data, $userId): Blog {
            if (! filled($blog->slug)) {
                $data['slug'] = SlugGenerator::generate($data['title'] ?? $blog->title, Blog::class, $blog->id);
            } else {
                unset($data['slug']);
            }

            if (array_key_exists('content', $data)) {
                $data['reading_time_minutes'] = $this->readingTime($data['content']);
            }

            $data['updated_by'] = $userId;
            $this->storeFeaturedImage($data, $blog->featured_image);
            $blog->fill($this->normalizePublishDates($data))->save();
            SeoMetadataService::invalidateCache();

            return $blog->refresh()->load('author:id,name,email');
        });
    }

    public function delete(Blog $blog): void
    {
        $blog->delete();
        SeoMetadataService::invalidateCache();
    }

    public function bulkDelete(array $ids): int
    {
        $deleted = Blog::query()->whereIn('id', $ids)->delete();
        SeoMetadataService::invalidateCache();

        return $deleted;
    }

    private function readingTime(string $content): int
    {
        $words = str_word_count(strip_tags($content));

        return max(1, (int) ceil($words / 200));
    }

    private function storeFeaturedImage(array &$data, ?string $oldImage = null): void
    {
        $file = $data['featured_image_file'] ?? null;
        unset($data['featured_image_file']);

        if (! $file instanceof UploadedFile || ! $file->isValid()) {
            return;
        }

        $data['featured_image'] = $this->storePublicUpload($file, 'blogs/featured', $oldImage);
    }

    private function normalizePublishDates(array $data): array
    {
        if (($data['status'] ?? null) === 'published' && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        return $data;
    }
}
