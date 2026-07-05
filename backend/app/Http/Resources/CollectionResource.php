<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class CollectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'title' => $this->display_title ?: $this->name,
            'description' => $this->description ?: '',
            'subtitle' => $this->subtitle,
            'promotionalText' => $this->promotional_text,
            'type' => $this->collection_type ?: $this->type,
            'ruleKey' => $this->rule_key,
            'featured' => (bool) $this->is_featured,
            'showOnHome' => (bool) $this->show_on_home,
            'homeSortOrder' => (int) $this->home_sort_order,
            'displayPositionAnchor' => $this->display_position_anchor ?: 'products',
            'displayPositionPlacement' => $this->display_position_placement ?: 'before',
            'productLimit' => (int) $this->product_limit,
            'priority' => (int) $this->priority,
            'discountEnabled' => (bool) $this->discount_enabled,
            'discountType' => $this->discount_type,
            'discountValue' => $this->discount_value,
            'discountApplyTo' => $this->discount_apply_to ?: 'entire_collection',
            'startsAt' => optional($this->starts_at)->toISOString(),
            'endsAt' => optional($this->ends_at)->toISOString(),
            'bannerImage' => $this->assetUrl($this->banner_image_url),
            'mobileBannerImage' => $this->assetUrl($this->mobile_banner_image_url),
            'logo' => $this->assetUrl($this->logo_url),
            'ctaText' => $this->cta_text,
            'ctaUrl' => $this->cta_url,
            'url' => "/collections/{$this->slug}",
            'aliases' => $this->route_aliases ?: [],
            'seo' => [
                'title' => $this->meta_title ?: "{$this->name} | LuxeCart",
                'description' => $this->meta_description ?: $this->description,
                'keywords' => $this->meta_keywords,
                'canonicalUrl' => $this->canonical_url ?: url("/collections/{$this->slug}"),
                'ogTitle' => $this->og_title ?: $this->meta_title,
                'ogDescription' => $this->og_description ?: $this->meta_description,
                'ogImage' => $this->assetUrl($this->og_image_url) ?: $this->assetUrl($this->banner_image_url),
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
