<?php

namespace App\Http\Resources\Admin;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Currency;
use App\Models\Discount;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductCollection;
use App\Models\ProductComment;
use App\Models\ProductReview;
use App\Models\Tag;
use App\Services\Collections\CollectionProductResolver;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductModuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $base = [
            'id' => $this->id,
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];

        return match ($this->resource::class) {
            Brand::class => $base + [
                'name' => $this->name,
                'slug' => $this->slug,
                'description' => $this->description,
                'logo_url' => $this->logo_url,
                'cover_image_url' => $this->cover_image_url,
                'website_url' => $this->website_url,
                'meta_title' => $this->meta_title,
                'meta_description' => $this->meta_description,
                'meta_keywords' => $this->meta_keywords,
                'canonical_url' => $this->canonical_url,
                'og_title' => $this->og_title,
                'og_description' => $this->og_description,
                'og_image_url' => $this->og_image_url,
                'is_featured' => (bool) $this->is_featured,
                'sort_order' => $this->sort_order,
                'status' => $this->status,
                'products_count' => $this->products_count ?? 0,
            ],
            Category::class => $base + [
                'parent_id' => $this->parent_id,
                'name' => $this->name,
                'slug' => $this->slug,
                'description' => $this->description,
                'image_url' => $this->image_url,
                'icon' => $this->icon,
                'meta_title' => $this->meta_title,
                'meta_description' => $this->meta_description,
                'meta_keywords' => $this->meta_keywords,
                'canonical_url' => $this->canonical_url,
                'og_title' => $this->og_title,
                'og_description' => $this->og_description,
                'og_image_url' => $this->og_image_url,
                'is_featured' => (bool) $this->is_featured,
                'show_on_home' => (bool) $this->show_on_home,
                'show_in_navbar' => (bool) $this->show_in_navbar,
                'home_display_order' => $this->home_display_order,
                'navbar_display_order' => $this->navbar_display_order,
                'sort_order' => $this->sort_order,
                'status' => $this->status,
                'parent' => $this->whenLoaded('parent', fn () => $this->parent ? ['id' => $this->parent->id, 'name' => $this->parent->name] : null),
                'products_count' => $this->products_count ?? 0,
            ],
            ProductAttribute::class => $base + [
                'name' => $this->name,
                'slug' => $this->slug,
                'type' => $this->type,
                'is_filterable' => (bool) $this->is_filterable,
                'is_variant_defining' => (bool) $this->is_variant_defining,
                'sort_order' => $this->sort_order,
                'values_count' => $this->values_count ?? 0,
            ],
            ProductAttributeValue::class => $base + [
                'attribute_id' => $this->attribute_id,
                'value' => $this->value,
                'slug' => $this->slug,
                'display_value' => $this->display_value,
                'hex_color' => $this->hex_color,
                'sort_order' => $this->sort_order,
                'attribute' => $this->whenLoaded('attribute', fn () => ['id' => $this->attribute->id, 'name' => $this->attribute->name, 'type' => $this->attribute->type]),
            ],
            Tag::class => $base + [
                'name' => $this->name,
                'slug' => $this->slug,
                'products_count' => $this->products_count ?? 0,
            ],
            ProductCollection::class => $base + [
                'name' => $this->name,
                'slug' => $this->slug,
                'description' => $this->description,
                'type' => $this->type,
                'collection_type' => $this->collection_type ?: $this->type,
                'rule_key' => $this->rule_key,
                'rules' => $this->rules ?: [],
                'status' => $this->status,
                'is_system' => (bool) $this->is_system,
                'is_featured' => (bool) $this->is_featured,
                'show_on_home' => (bool) $this->show_on_home,
                'home_sort_order' => $this->home_sort_order,
                'product_limit' => $this->product_limit,
                'priority' => $this->priority,
                'display_position_anchor' => $this->display_position_anchor,
                'display_position_placement' => $this->display_position_placement,
                'discount_enabled' => (bool) $this->discount_enabled,
                'discount_type' => $this->discount_type,
                'discount_value' => $this->discount_value,
                'starts_at' => optional($this->starts_at)->toISOString(),
                'ends_at' => optional($this->ends_at)->toISOString(),
                'banner_image_url' => $this->banner_image_url,
                'mobile_banner_image_url' => $this->mobile_banner_image_url,
                'logo_url' => $this->logo_url,
                'display_title' => $this->display_title,
                'subtitle' => $this->subtitle,
                'promotional_text' => $this->promotional_text,
                'cta_text' => $this->cta_text,
                'cta_url' => $this->cta_url,
                'route_aliases' => $this->route_aliases ?: [],
                'meta_title' => $this->meta_title,
                'meta_description' => $this->meta_description,
                'meta_keywords' => $this->meta_keywords,
                'canonical_url' => $this->canonical_url,
                'og_title' => $this->og_title,
                'og_description' => $this->og_description,
                'og_image_url' => $this->og_image_url,
                'products' => ProductOptionResource::collection($this->whenLoaded('products')),
                'products_count' => app(CollectionProductResolver::class)->resolvedProductCount($this->resource),
                'assigned_products_count' => $this->products_count ?? 0,
            ],
            Currency::class => $base + [
                'country' => $this->country,
                'currency' => $this->currency,
                'symbol' => $this->symbol,
                'status' => $this->status,
            ],
            Discount::class => $base + [
                'name' => $this->name,
                'code' => $this->code,
                'type' => $this->type,
                'value' => $this->type === 'fixed' ? round(((int) $this->value) / 100, 2) : (int) $this->value,
                'minimum_order_amount' => $this->minimum_order_amount !== null ? round(((int) $this->minimum_order_amount) / 100, 2) : null,
                'maximum_discount' => $this->maximum_discount !== null ? round(((int) $this->maximum_discount) / 100, 2) : null,
                'starts_at' => optional($this->starts_at)->toISOString(),
                'ends_at' => optional($this->ends_at)->toISOString(),
                'status' => $this->status,
                'usage_limit' => $this->usage_limit,
                'usage_per_customer' => $this->usage_per_customer,
                'total_used' => $this->total_used,
                'first_order_only' => (bool) $this->first_order_only,
                'free_shipping' => (bool) $this->free_shipping,
                'products' => ProductOptionResource::collection($this->whenLoaded('products')),
                'categories' => ProductOptionResource::collection($this->whenLoaded('categories')),
                'brands' => ProductOptionResource::collection($this->whenLoaded('brands')),
                'collections' => ProductOptionResource::collection($this->whenLoaded('collections')),
                'excluded_products' => ProductOptionResource::collection($this->whenLoaded('excludedProducts')),
                'excluded_categories' => ProductOptionResource::collection($this->whenLoaded('excludedCategories')),
            ],
            ProductReview::class => $base + [
                'product_id' => $this->product_id,
                'user_id' => $this->user_id,
                'guest_name' => $this->guest_name,
                'guest_email' => $this->guest_email,
                'rating' => $this->rating,
                'comment' => $this->comment,
                'admin_reply' => $this->admin_reply,
                'admin_replied_at' => optional($this->admin_replied_at)->toISOString(),
                'replies' => $this->whenLoaded('replies', fn () => $this->replies->map(fn ($reply) => [
                    'id' => $reply->id,
                    'comment' => $reply->comment,
                    'status' => $reply->status,
                    'author' => $reply->user?->name ?? 'Store',
                    'created_at' => optional($reply->created_at)->toISOString(),
                    'parent_id' => $reply->parent_id,
                ])->values()),
                'is_verified_purchase' => (bool) $this->is_verified_purchase,
                'status' => $this->status,
                'product' => $this->whenLoaded('product', fn () => $this->product ? ['id' => $this->product->id, 'name' => $this->product->name] : null),
                'user' => $this->whenLoaded('user', fn () => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name] : null),
            ],
            ProductComment::class => $base + [
                'product_id' => $this->product_id,
                'user_id' => $this->user_id,
                'guest_name' => $this->guest_name,
                'guest_email' => $this->guest_email,
                'content' => $this->content,
                'status' => $this->status,
                'approved_at' => optional($this->approved_at)->toISOString(),
                'edited_at' => optional($this->edited_at)->toISOString(),
                'product' => $this->whenLoaded('product', fn () => $this->product ? ['id' => $this->product->id, 'name' => $this->product->name] : null),
                'user' => $this->whenLoaded('user', fn () => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name] : null),
            ],
            default => $base,
        };
    }
}
