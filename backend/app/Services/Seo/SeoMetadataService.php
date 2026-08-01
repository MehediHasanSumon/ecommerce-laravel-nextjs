<?php

namespace App\Services\Seo;

use App\Models\Blog;
use App\Models\Brand;
use App\Models\Category;
use App\Models\ContentPage;
use App\Models\Product;
use App\Models\ProductCollection;
use App\Models\Settings\CompanySetting;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\SeoSettingsService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SeoMetadataService
{
    private const CACHE_VERSION_KEY = 'seo.metadata.version';

    public function __construct(
        private readonly SeoSettingsService $settings,
        private readonly BrandSettingsService $brandSettings,
    ) {}

    public function defaults(): array
    {
        return Cache::remember("seo.metadata.defaults.{$this->cacheVersion()}", now()->addMinutes(10), function (): array {
            $settings = $this->settings->get();
            $company = CompanySetting::query()->with('currency')->first();
            $siteName = $settings->site_title ?: config('app.name');
            $canonicalDomain = rtrim((string) ($settings->canonical_url ?: config('app.url')), '/');
            $robots = $this->robots((bool) $settings->robots_index, (bool) $settings->robots_follow);
            $favicon = $this->versionedAssetUrl($company?->favicon, optional($company?->updated_at)->timestamp);
            $defaultImage = $this->assetUrl($settings->og_image) ?: $this->assetUrl($company?->logo);

            return [
                'siteName' => $siteName,
                'siteTitle' => $settings->site_title,
                'title' => $settings->meta_title ?: $siteName,
                'description' => $settings->meta_description,
                'keywords' => $settings->meta_keywords,
                'canonicalDomain' => $canonicalDomain,
                'canonicalUrl' => $canonicalDomain,
                'robots' => $robots,
                'favicon' => $favicon,
                'openGraph' => [
                    'title' => $settings->og_title ?: $settings->meta_title ?: $siteName,
                    'description' => $settings->og_description ?: $settings->meta_description,
                    'image' => $defaultImage,
                    'type' => 'website',
                    'siteName' => $siteName,
                ],
                'twitter' => [
                    'card' => $settings->twitter_card_type ?: 'summary_large_image',
                    'title' => $settings->twitter_title ?: $settings->og_title ?: $settings->meta_title ?: $siteName,
                    'description' => $settings->twitter_description ?: $settings->og_description ?: $settings->meta_description,
                    'image' => $this->assetUrl($settings->twitter_image) ?: $defaultImage,
                ],
                'sitemapEnabled' => (bool) $settings->enable_sitemap,
                'sitemapUrl' => $settings->sitemap_url,
            ];
        });
    }

    public function entity(string $type, string $slug): ?array
    {
        return Cache::remember("seo.metadata.entity.{$type}.{$slug}.{$this->cacheVersion()}", now()->addMinutes(10), fn () => match ($type) {
            'product' => $this->product($slug),
            'category' => $this->category($slug),
            'brand' => $this->brandSettings->enabled() ? $this->brand($slug) : null,
            'collection' => $this->collection($slug),
            'blog' => $this->blog($slug),
            'content-page' => $this->contentPage($slug),
            default => null,
        });
    }

    public function sitemapEntries(): array
    {
        return Cache::remember("seo.sitemap.entries.{$this->cacheVersion()}", now()->addMinutes(15), function (): array {
            $defaults = $this->defaults();
            $base = $defaults['canonicalDomain'];
            $brandsEnabled = $this->brandSettings->enabled();
            $entries = [
                $this->entry("{$base}/"),
                $this->entry("{$base}/shop"),
                $this->entry("{$base}/categories"),
                $this->entry("{$base}/blogs"),
                $this->entry("{$base}/contact"),
                $this->entry("{$base}/about"),
            ];

            if ($brandsEnabled) {
                $entries[] = $this->entry("{$base}/brands");
            }

            Product::query()->where('status', 'active')->whereNotNull('published_at')->get(['slug', 'updated_at'])->each(
                fn (Product $product) => $entries[] = $this->entry("{$base}/products/{$product->slug}", $product->updated_at)
            );
            Category::query()->where('status', 'active')->get(['slug', 'updated_at'])->each(
                fn (Category $category) => $entries[] = $this->entry("{$base}/categories/{$category->slug}", $category->updated_at)
            );
            if ($brandsEnabled) {
                Brand::query()->where('status', 'active')->get(['slug', 'updated_at'])->each(
                    fn (Brand $brand) => $entries[] = $this->entry("{$base}/brands/{$brand->slug}", $brand->updated_at)
                );
            }
            ProductCollection::query()->where('status', 'active')->get(['slug', 'updated_at'])->each(
                fn (ProductCollection $collection) => $entries[] = $this->entry("{$base}/collections/{$collection->slug}", $collection->updated_at)
            );
            Blog::query()->published()->get(['slug', 'updated_at'])->each(
                fn (Blog $blog) => $entries[] = $this->entry("{$base}/blogs/{$blog->slug}", $blog->updated_at)
            );
            ContentPage::query()->where('is_active', true)->get(['slug', 'updated_at'])->each(
                fn (ContentPage $page) => $entries[] = $this->entry("{$base}/{$page->slug}", $page->updated_at)
            );

            return collect($entries)->unique('url')->values()->all();
        });
    }

    public static function invalidateCache(): void
    {
        $version = (int) Cache::get(self::CACHE_VERSION_KEY, 1);

        Cache::forever(self::CACHE_VERSION_KEY, $version + 1);
        Cache::forget('seo.metadata.defaults.v1');
        Cache::forget('seo.sitemap.entries.v1');
    }

    private function product(string $slug): ?array
    {
        $product = Product::query()
            ->where('slug', $slug)
            ->where('status', 'active')
            ->withSellableVariantMetrics()
            ->with(['brand:id,name,slug', 'category:id,name,slug', 'tags:id,name', 'images:id,product_id,url,is_primary,sort_order', 'seo'])
            ->first();

        if (! $product) {
            return null;
        }

        $image = $this->assetUrl($product->seo?->og_image_url)
            ?: $this->assetUrl($product->images->firstWhere('is_primary', true)?->url)
            ?: $this->assetUrl($product->images->sortBy('sort_order')->first()?->url);
        $primaryVariant = $product->defaultActiveVariant();
        $priceCents = $product->effectivePriceCents($primaryVariant);
        $trackInventory = $primaryVariant
            ? (bool) $primaryVariant->track_inventory
            : (bool) $product->track_inventory;
        $stockQuantity = $primaryVariant?->stock_quantity ?? $product->stock_quantity;

        $structuredData = [
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $product->name,
            'description' => $product->short_description ?: $product->description,
            'image' => $image ? [$image] : [],
            'sku' => $primaryVariant?->sku ?: $product->sku,
            'category' => $product->category?->name,
            'offers' => [
                '@type' => 'Offer',
                'priceCurrency' => $product->currency ?: 'BDT',
                'price' => round(((int) $priceCents) / 100, 2),
                'availability' => ((int) $stockQuantity > 0 || ! $trackInventory)
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/OutOfStock',
            ],
        ];

        if ($this->brandSettings->enabled() && $product->brand?->name) {
            $structuredData['brand'] = ['@type' => 'Brand', 'name' => $product->brand->name];
        }

        return $this->payload(
            title: $product->seo?->meta_title ?: $product->name,
            description: $product->seo?->meta_description ?: $product->short_description ?: Str::limit(strip_tags((string) $product->description), 155),
            path: "/products/{$product->slug}",
            image: $image,
            type: 'product',
            keywords: $product->seo?->meta_keywords ?: $this->keywords([$product->name, $product->brand?->name, $product->category?->name, ...$product->tags->pluck('name')->all()]),
            canonicalUrl: $product->seo?->canonical_url,
            structuredData: $structuredData,
        );
    }

    private function category(string $slug): ?array
    {
        $category = Category::query()->where('slug', $slug)->where('status', 'active')->first();
        if (! $category) {
            return null;
        }

        return $this->payload(
            title: $category->meta_title ?: $category->name,
            description: $category->meta_description ?: $category->description,
            path: "/categories/{$category->slug}",
            image: $this->assetUrl($category->og_image_url ?: $category->image_url),
            keywords: $category->meta_keywords ?: $this->keywords([$category->name]),
            canonicalUrl: $category->canonical_url,
        );
    }

    private function brand(string $slug): ?array
    {
        if (! $this->brandSettings->enabled()) {
            return null;
        }

        $brand = Brand::query()->where('slug', $slug)->where('status', 'active')->first();
        if (! $brand) {
            return null;
        }

        return $this->payload(
            title: $brand->meta_title ?: $brand->name,
            description: $brand->meta_description ?: $brand->description,
            path: "/brands/{$brand->slug}",
            image: $this->assetUrl($brand->og_image_url ?: $brand->logo_url ?: $brand->cover_image_url),
            keywords: $brand->meta_keywords ?: $this->keywords([$brand->name]),
            canonicalUrl: $brand->canonical_url,
            structuredData: [
                '@context' => 'https://schema.org',
                '@type' => 'Brand',
                'name' => $brand->name,
                'description' => $brand->description,
                'logo' => $this->assetUrl($brand->logo_url),
                'url' => $brand->website_url,
            ],
        );
    }

    private function collection(string $slug): ?array
    {
        $collection = ProductCollection::query()->where('slug', $slug)->where('status', 'active')->first();
        if (! $collection) {
            return null;
        }

        return $this->payload(
            title: $collection->meta_title ?: $collection->display_title ?: $collection->name,
            description: $collection->meta_description ?: $collection->description,
            path: "/collections/{$collection->slug}",
            image: $this->assetUrl($collection->og_image_url ?: $collection->banner_image_url),
            keywords: $collection->meta_keywords ?: $this->keywords([$collection->name, $collection->display_title, $collection->subtitle, $collection->promotional_text]),
            canonicalUrl: $collection->canonical_url,
            structuredData: [
                '@context' => 'https://schema.org',
                '@type' => 'CollectionPage',
                'name' => $collection->display_title ?: $collection->name,
                'description' => $collection->description,
            ],
        );
    }

    private function blog(string $slug): ?array
    {
        $blog = Blog::query()->where('slug', $slug)->published()->with('author:id,name')->first();
        if (! $blog) {
            return null;
        }

        return $this->payload(
            title: $blog->meta_title ?: $blog->title,
            description: $blog->meta_description ?: $blog->excerpt,
            path: "/blogs/{$blog->slug}",
            image: $this->assetUrl($blog->open_graph_image ?: $blog->featured_image),
            type: 'article',
            keywords: $blog->meta_keywords ?: $this->keywords([$blog->title, $blog->excerpt]),
            canonicalUrl: $blog->canonical_url,
            structuredData: [
                '@context' => 'https://schema.org',
                '@type' => 'BlogPosting',
                'headline' => $blog->title,
                'description' => $blog->excerpt,
                'image' => $this->assetUrl($blog->open_graph_image ?: $blog->featured_image),
                'author' => ['@type' => 'Person', 'name' => $blog->author?->name ?: 'Author'],
                'datePublished' => optional($blog->published_at)->toISOString(),
                'dateModified' => optional($blog->updated_at)->toISOString(),
            ],
        );
    }

    private function contentPage(string $slug): ?array
    {
        $page = ContentPage::query()->where('slug', $slug)->where('is_active', true)->first();
        if (! $page) {
            return null;
        }

        return $this->payload(
            title: $page->meta_title ?: $page->title,
            description: $page->meta_description ?: $page->description,
            path: "/{$page->slug}",
            image: $this->assetUrl($page->og_image_url),
            keywords: $page->meta_keywords ?: $this->keywords([$page->title]),
            canonicalUrl: $page->canonical_url,
        );
    }

    private function payload(string $title, ?string $description, string $path, ?string $image = null, string $type = 'website', ?string $keywords = null, ?string $canonicalUrl = null, ?array $structuredData = null): array
    {
        $defaults = $this->defaults();
        $canonical = $canonicalUrl ?: $defaults['canonicalDomain'].$path;
        $fullTitle = str_contains($title, (string) $defaults['siteName']) ? $title : "{$title} | {$defaults['siteName']}";

        return [
            'title' => $fullTitle,
            'description' => $description ?: $defaults['description'],
            'keywords' => $keywords ?: $defaults['keywords'],
            'canonicalUrl' => $canonical,
            'robots' => $defaults['robots'],
            'openGraph' => [
                'title' => $fullTitle,
                'description' => $description ?: $defaults['description'],
                'image' => $image ?: $defaults['openGraph']['image'],
                'url' => $canonical,
                'type' => $type,
                'siteName' => $defaults['siteName'],
            ],
            'twitter' => [
                'card' => $defaults['twitter']['card'],
                'title' => $fullTitle,
                'description' => $description ?: $defaults['description'],
                'image' => $image ?: $defaults['twitter']['image'] ?: $defaults['openGraph']['image'],
            ],
            'structuredData' => $structuredData,
        ];
    }

    private function robots(bool $index, bool $follow): string
    {
        return ($index ? 'index' : 'noindex').','.($follow ? 'follow' : 'nofollow');
    }

    private function cacheVersion(): string
    {
        return 'v'.((int) Cache::get(self::CACHE_VERSION_KEY, 1));
    }

    private function entry(string $url, mixed $updatedAt = null): array
    {
        return [
            'url' => $url,
            'lastModified' => optional($updatedAt)->toISOString() ?: now()->toISOString(),
            'changeFrequency' => 'daily',
            'priority' => $url === $this->defaults()['canonicalDomain'].'/' ? 1 : 0.7,
        ];
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (str_starts_with($path, '/storage/') || str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return Storage::disk('public')->url($path);
    }

    private function versionedAssetUrl(?string $path, ?int $version): ?string
    {
        $url = $this->assetUrl($path);
        if (! $url) {
            return null;
        }

        return $url.(str_contains($url, '?') ? '&' : '?').'v='.($version ?: time());
    }

    private function keywords(array $parts): ?string
    {
        $words = collect($parts)
            ->filter()
            ->flatMap(fn ($part) => preg_split('/[,\s|]+/', Str::lower(strip_tags((string) $part))) ?: [])
            ->map(fn ($word) => trim((string) $word, " \t\n\r\0\x0B.-_"))
            ->filter(fn ($word) => Str::length($word) > 2)
            ->unique()
            ->take(12)
            ->values();

        return $words->isEmpty() ? null : $words->implode(', ');
    }
}
