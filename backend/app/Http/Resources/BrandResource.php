<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class BrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $appName = config('app.name', 'Ecommerce');

        return [
            'id' => (string) $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description ?: '',
            'logo' => $this->assetUrl($this->logo_url) ?: 'https://ui-avatars.com/api/?name='.urlencode($this->name).'&background=111827&color=fff',
            'coverImage' => $this->assetUrl($this->cover_image_url) ?: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200&auto=format&fit=crop',
            'productCount' => (int) ($this->products_count ?? 0),
            'featured' => (bool) $this->is_featured,
            'sortOrder' => (int) ($this->sort_order ?? 0),
            'website' => $this->website_url,
            'seo' => [
                'title' => $this->meta_title ?: "{$this->name} | {$appName}",
                'description' => $this->meta_description ?: $this->description ?: "Shop {$this->name} products at {$appName}.",
                'keywords' => $this->meta_keywords,
                'canonicalUrl' => $this->canonical_url ?: url("/brands/{$this->slug}"),
                'ogTitle' => $this->og_title ?: $this->meta_title,
                'ogDescription' => $this->og_description ?: $this->meta_description,
                'ogImage' => $this->assetUrl($this->og_image_url) ?: $this->assetUrl($this->cover_image_url) ?: $this->assetUrl($this->logo_url),
            ],
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
}
