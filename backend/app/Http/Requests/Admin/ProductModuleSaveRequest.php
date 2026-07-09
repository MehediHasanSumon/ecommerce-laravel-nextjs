<?php

namespace App\Http\Requests\Admin;

use App\Models\Category;
use App\Services\Admin\Settings\CategoryDisplaySettingsService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProductModuleSaveRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $decoded = [];
        foreach (['tags', 'attribute_values', 'images', 'features', 'specifications', 'seo', 'variants', 'products', 'categories', 'rules', 'route_aliases'] as $key) {
            $value = $this->input($key);
            if (is_string($value) && (str_starts_with(trim($value), '[') || str_starts_with(trim($value), '{'))) {
                $decoded[$key] = json_decode($value, true);
            }
        }

        if ($decoded !== []) {
            $this->merge($decoded);
        }

        if ((string) $this->route('module') === 'collections' && is_array($this->input('products'))) {
            $this->merge([
                'products' => collect($this->input('products'))
                    ->map(fn ($product, int $index) => is_array($product) ? $product : ['id' => $product, 'sort_order' => $index])
                    ->values()
                    ->all(),
            ]);
        }

        if ((string) $this->route('module') === 'collections') {
            $this->merge([
                'collection_type' => $this->input('collection_type', $this->input('type', 'manual') === 'automatic' ? 'smart' : 'manual'),
                'display_position_anchor' => $this->input('display_position_anchor', 'products'),
                'display_position_placement' => $this->input('display_position_placement', 'before'),
                'discount_apply_to' => $this->input('discount_apply_to', 'entire_collection'),
                'discount_enabled' => filter_var($this->input('discount_enabled', false), FILTER_VALIDATE_BOOL),
            ]);
        }

        if ((string) $this->route('module') === 'currencies' && filled($this->input('currency'))) {
            $this->merge(['currency' => strtoupper((string) $this->input('currency'))]);
        }

        if ((string) $this->route('module') === 'products' && is_array($this->input('variants'))) {
            $this->merge([
                'variants' => collect($this->input('variants'))
                    ->map(function ($variant) {
                        if (! is_array($variant)) {
                            return $variant;
                        }

                        foreach ([
                            'price_cents',
                            'compare_at_price_cents',
                            'cost_price_cents',
                            'low_stock_threshold',
                            'weight_grams',
                            'image_file_index',
                        ] as $field) {
                            if (! filled($variant[$field] ?? null)) {
                                $variant[$field] = null;
                                continue;
                            }

                            $variant[$field] = (int) $variant[$field];
                        }

                        $variant['stock_quantity'] = filled($variant['stock_quantity'] ?? null)
                            ? (int) $variant['stock_quantity']
                            : 0;
                        $variant['status'] = filled($variant['status'] ?? null)
                            ? $variant['status']
                            : 'active';

                        return $variant;
                    })
                    ->values()
                    ->all(),
            ]);
        }

        if ((string) $this->route('module') === 'discounts') {
            $this->merge([
                'code' => filled($this->input('code')) ? strtoupper(trim((string) $this->input('code'))) : null,
                'first_order_only' => filter_var($this->input('first_order_only', false), FILTER_VALIDATE_BOOL),
                'free_shipping' => filter_var($this->input('free_shipping', false), FILTER_VALIDATE_BOOL),
                'stackable' => filter_var($this->input('stackable', false), FILTER_VALIDATE_BOOL),
                'applicable_scope' => $this->input('applicable_scope', 'all'),
            ]);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $module = (string) $this->route('module');
        $id = $this->route('id');

        return match ($module) {
            'brands' => [
                'name' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'logo_url' => ['nullable', 'string'],
                'cover_image_url' => ['nullable', 'string'],
                'logo_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
                'cover_image_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
                'website_url' => ['nullable', 'url', 'max:255'],
                'meta_title' => ['nullable', 'string', 'max:255'],
                'meta_description' => ['nullable', 'string', 'max:500'],
                'meta_keywords' => ['nullable', 'string', 'max:500'],
                'canonical_url' => ['nullable', 'url', 'max:2048'],
                'og_title' => ['nullable', 'string', 'max:255'],
                'og_description' => ['nullable', 'string', 'max:500'],
                'og_image_url' => ['nullable', 'string', 'max:500'],
                'is_featured' => ['boolean'],
                'status' => ['required', Rule::in(['active', 'inactive'])],
            ],
            'categories' => [
                'parent_id' => ['nullable', 'integer', 'exists:categories,id', Rule::notIn([(int) $id])],
                'name' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'image_url' => ['nullable', 'string'],
                'image_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
                'icon' => ['nullable', 'string', 'max:255'],
                'meta_title' => ['nullable', 'string', 'max:255'],
                'meta_description' => ['nullable', 'string', 'max:500'],
                'meta_keywords' => ['nullable', 'string', 'max:500'],
                'canonical_url' => ['nullable', 'url', 'max:2048'],
                'og_title' => ['nullable', 'string', 'max:255'],
                'og_description' => ['nullable', 'string', 'max:500'],
                'og_image_url' => ['nullable', 'string', 'max:500'],
                'is_featured' => ['boolean'],
                'show_on_home' => ['boolean'],
                'show_in_navbar' => ['boolean'],
                'home_display_order' => ['nullable', 'integer', 'min:0'],
                'navbar_display_order' => ['nullable', 'integer', 'min:0'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'status' => ['required', Rule::in(['active', 'inactive'])],
            ],
            'attributes' => [
                'name' => ['required', 'string', 'max:255'],
                'type' => ['required', Rule::in(['text', 'color', 'image', 'number', 'select'])],
                'is_filterable' => ['boolean'],
                'is_variant_defining' => ['boolean'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
            ],
            'attribute-values' => [
                'attribute_id' => ['required', 'integer', 'exists:attributes,id'],
                'value' => ['required', 'string', 'max:255'],
                'display_value' => ['nullable', 'string', 'max:255'],
                'hex_color' => ['nullable', 'string', 'max:20'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
            ],
            'tags' => [
                'name' => ['required', 'string', 'max:255'],
            ],
            'warehouses' => [
                'name' => ['required', 'string', 'max:255'],
                'code' => ['required', 'string', 'max:255', Rule::unique('warehouses', 'code')->ignore($id)],
                'status' => ['required', Rule::in(['active', 'inactive'])],
                'address' => ['nullable', 'string'],
                'city' => ['nullable', 'string', 'max:255'],
                'state' => ['nullable', 'string', 'max:255'],
                'country' => ['nullable', 'string', 'max:255'],
                'postal_code' => ['nullable', 'string', 'max:255'],
            ],
            'currencies' => [
                'country' => ['required', 'string', 'max:255'],
                'currency' => ['required', 'string', 'size:3', Rule::unique('currencies', 'currency')->ignore($id)],
                'symbol' => ['required', 'string', 'max:20'],
                'status' => ['required', Rule::in(['active', 'inactive'])],
            ],
            'products' => $this->productRules($id),
            'collections' => [
                'name' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string'],
                'type' => ['nullable', Rule::in(['manual', 'automatic', 'smart'])],
                'collection_type' => ['required', Rule::in(['manual', 'smart'])],
                'rule_key' => ['nullable', Rule::in(['flash_sale', 'trending', 'best_sellers', 'new_arrivals', 'recently_added', 'featured', 'custom'])],
                'rules' => ['nullable', 'array'],
                'rules.*.field' => ['required_with:rules', 'string', 'max:100'],
                'rules.*.operator' => ['nullable', 'string', 'max:50'],
                'rules.*.value' => ['nullable'],
                'status' => ['required', Rule::in(['active', 'inactive'])],
                'is_featured' => ['boolean'],
                'show_on_home' => ['boolean'],
                'home_sort_order' => ['nullable', 'integer', 'min:0'],
                'product_limit' => ['nullable', 'integer', 'min:1', 'max:48'],
                'priority' => ['nullable', 'integer', 'min:0'],
                'display_position_anchor' => ['required', Rule::in(['feature_cards', 'categories', 'promo_banners', 'top_brands', 'products', 'reviews', 'blog', 'newsletter'])],
                'display_position_placement' => ['required', Rule::in(['before', 'after'])],
                'discount_enabled' => ['boolean'],
                'discount_type' => ['nullable', 'required_if:discount_enabled,true,1', Rule::in(['percentage', 'fixed'])],
                'discount_value' => ['nullable', 'required_if:discount_enabled,true,1', 'integer', 'min:1'],
                'discount_apply_to' => ['required', Rule::in(['entire_collection', 'selected_products'])],
                'starts_at' => ['nullable', 'date'],
                'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
                'banner_image_url' => ['nullable', 'string'],
                'mobile_banner_image_url' => ['nullable', 'string'],
                'logo_url' => ['nullable', 'string'],
                'banner_image_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
                'mobile_banner_image_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
                'logo_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
                'display_title' => ['nullable', 'string', 'max:255'],
                'subtitle' => ['nullable', 'string', 'max:255'],
                'promotional_text' => ['nullable', 'string', 'max:255'],
                'cta_text' => ['nullable', 'string', 'max:255'],
                'cta_url' => ['nullable', 'url', 'max:255'],
                'route_aliases' => ['nullable', 'array'],
                'route_aliases.*' => ['string', 'max:255'],
                'meta_title' => ['nullable', 'string', 'max:255'],
                'meta_description' => ['nullable', 'string'],
                'meta_keywords' => ['nullable', 'string'],
                'canonical_url' => ['nullable', 'url', 'max:255'],
                'og_title' => ['nullable', 'string', 'max:255'],
                'og_description' => ['nullable', 'string'],
                'og_image_url' => ['nullable', 'string'],
                'products' => ['nullable', 'array'],
                'products.*.id' => ['required_with:products', 'integer', 'exists:products,id'],
                'products.*.sort_order' => ['nullable', 'integer', 'min:0'],
            ],
            'discounts' => [
                'name' => ['required', 'string', 'max:255'],
                'code' => ['nullable', 'string', 'max:255', Rule::unique('discounts', 'code')->ignore($id)],
                'type' => ['required', Rule::in(['fixed', 'percentage'])],
                'value' => ['required', 'numeric', 'min:0.01'],
                'minimum_order_amount' => ['nullable', 'numeric', 'min:0'],
                'maximum_discount' => ['nullable', 'numeric', 'min:0'],
                'starts_at' => ['nullable', 'date'],
                'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
                'status' => ['required', Rule::in(['active', 'inactive'])],
                'usage_limit' => ['nullable', 'integer', 'min:1'],
                'usage_per_customer' => ['nullable', 'integer', 'min:1'],
                'first_order_only' => ['boolean'],
                'free_shipping' => ['boolean'],
                'stackable' => ['boolean'],
                'applicable_scope' => ['required', Rule::in(['all', 'products', 'categories', 'brands', 'mixed'])],
                'products' => ['nullable', 'array'],
                'products.*' => ['integer', 'exists:products,id'],
                'categories' => ['nullable', 'array'],
                'categories.*' => ['integer', 'exists:categories,id'],
                'brands' => ['nullable', 'array'],
                'brands.*' => ['integer', 'exists:brands,id'],
                'excluded_products' => ['nullable', 'array'],
                'excluded_products.*' => ['integer', 'exists:products,id'],
                'excluded_categories' => ['nullable', 'array'],
                'excluded_categories.*' => ['integer', 'exists:categories,id'],
            ],
            'reviews' => [
                'product_id' => ['required', 'integer', 'exists:products,id'],
                'user_id' => ['nullable', 'integer', 'exists:users,id'],
                'rating' => ['required', 'integer', 'min:1', 'max:5'],
                'comment' => ['required', 'string'],
                'admin_reply' => ['nullable', 'string', 'max:2000'],
                'status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
                'is_verified_purchase' => ['boolean'],
            ],
            default => [],
        };
    }

    public function withValidator(Validator $validator): void
    {
        if ((string) $this->route('module') !== 'categories') {
            return;
        }

        $validator->after(function (Validator $validator): void {
            $mode = app(CategoryDisplaySettingsService::class)->get()->category_display_mode
                ?: CategoryDisplaySettingsService::MODE_LANDING_PAGE;

            if (in_array($mode, [
                CategoryDisplaySettingsService::MODE_HOME_GRID_NAVBAR_DROPDOWN,
                CategoryDisplaySettingsService::MODE_NAVBAR_DROPDOWN_ONLY,
            ], true) && ! filled($this->input('icon'))) {
                $validator->errors()->add('icon', 'The icon field is required for the selected category display mode.');
            }

            if ($mode !== CategoryDisplaySettingsService::MODE_LANDING_PAGE) {
                return;
            }

            if ($this->hasFile('image_file') || filled($this->input('image_url'))) {
                return;
            }

            $id = $this->route('id');
            $hasExistingImage = $id
                ? Category::query()->whereKey($id)->whereNotNull('image_url')->exists()
                : false;

            if (! $hasExistingImage) {
                $validator->errors()->add('image_file', 'The category image field is required for landing page mode.');
            }
        });
    }

    private function productRules(mixed $id): array
    {
        return [
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'short_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'product_type' => ['required', Rule::in(['physical', 'digital'])],
            'status' => ['required', Rule::in(['draft', 'active', 'archived'])],
            'base_price_cents' => ['required', 'integer', 'min:0'],
            'compare_at_price_cents' => ['nullable', 'integer', 'min:0'],
            'cost_price_cents' => ['nullable', 'integer', 'min:0'],
            'currency' => ['required', 'string', 'size:3'],
            'track_inventory' => ['boolean'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'is_featured' => ['boolean'],
            'is_new' => ['boolean'],
            'is_best_seller' => ['boolean'],
            'is_flash_sale' => ['boolean'],
            'flash_sale_ends_at' => ['nullable', 'date'],
            'free_shipping' => ['boolean'],
            'published_at' => ['nullable', 'date'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['nullable'],
            'attribute_values' => ['nullable', 'array'],
            'attribute_values.*' => ['integer', 'exists:attribute_values,id'],
            'images' => ['nullable', 'array'],
            'images.*.url' => ['required_with:images', 'string'],
            'images.*.alt_text' => ['nullable', 'string', 'max:255'],
            'images.*.type' => ['nullable', 'string', 'max:50'],
            'images.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'images.*.is_primary' => ['boolean'],
            'featured_image_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,avif,gif', 'max:10240'],
            'gallery_image_files' => ['nullable', 'array', 'max:10'],
            'gallery_image_files.*' => ['file', 'mimes:jpg,jpeg,png,webp,avif,gif', 'max:10240'],
            'tax_class' => ['nullable', 'string', 'max:100'],
            'stock_status' => ['nullable', 'string', 'max:50'],
            'backorders' => ['nullable', 'string', 'max:50'],
            'min_order_quantity' => ['nullable', 'integer', 'min:1'],
            'max_order_quantity' => ['nullable', 'integer', 'min:1'],
            'features' => ['nullable', 'array'],
            'features.*.value' => ['required_with:features', 'string'],
            'features.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'specifications' => ['nullable', 'array'],
            'specifications.*.group_name' => ['nullable', 'string', 'max:255'],
            'specifications.*.name' => ['required_with:specifications', 'string', 'max:255'],
            'specifications.*.value' => ['required_with:specifications', 'string'],
            'specifications.*.sort_order' => ['nullable', 'integer', 'min:0'],
            'seo' => ['nullable', 'array'],
            'seo.meta_title' => ['nullable', 'string', 'max:255'],
            'seo.meta_description' => ['nullable', 'string'],
            'seo.meta_keywords' => ['nullable', 'string', 'max:500'],
            'seo.canonical_url' => ['nullable', 'url', 'max:255'],
            'seo.og_image_url' => ['nullable', 'string'],
            'seo.schema_json' => ['nullable', 'array'],
            'variants' => ['nullable', 'array'],
            'variants.*.sku' => ['nullable', 'string', 'max:100'],
            'variants.*.barcode' => ['nullable', 'string', 'max:255'],
            'variants.*.image_url' => ['nullable', 'string', 'max:2048'],
            'variants.*.image_file_index' => ['nullable', 'integer', 'min:0'],
            'variants.*.price_cents' => ['nullable', 'integer', 'min:0'],
            'variants.*.compare_at_price_cents' => ['nullable', 'integer', 'min:0'],
            'variants.*.cost_price_cents' => ['nullable', 'integer', 'min:0'],
            'variants.*.stock_quantity' => ['nullable', 'integer', 'min:0'],
            'variants.*.low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'variants.*.weight_grams' => ['nullable', 'integer', 'min:0'],
            'variants.*.status' => ['required_with:variants', Rule::in(['active', 'inactive'])],
            'variants.*.attribute_values' => ['nullable', 'array'],
            'variants.*.attribute_values.*' => ['integer', 'exists:attribute_values,id'],
            'variant_image_files' => ['nullable', 'array'],
            'variant_image_files.*' => ['file', 'mimes:jpg,jpeg,png,webp,avif,gif', 'max:10240'],
        ];
    }

}
