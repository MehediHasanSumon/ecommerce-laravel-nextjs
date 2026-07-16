<?php

namespace App\Http\Requests\Admin;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductAttributeValue;
use App\Models\ProductVariant;
use App\Models\Settings\CompanySetting;
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
            $rules = $this->input('rules');
            if (is_array($rules) && $rules !== [] && ! array_is_list($rules)) {
                $rules = array_key_exists('field', $rules) ? [$rules] : array_values($rules);
            }
            if (is_array($rules)) {
                $rules = collect($rules)
                    ->filter(fn (mixed $rule): bool => is_array($rule) && filled($rule['field'] ?? null))
                    ->map(fn (array $rule): array => [
                        'field' => trim((string) $rule['field']),
                        'operator' => filled($rule['operator'] ?? null) ? trim((string) $rule['operator']) : null,
                        'value' => $rule['value'] ?? null,
                    ])
                    ->values()
                    ->all();
            }

            $routeAliases = $this->input('route_aliases');
            if (is_string($routeAliases) && trim($routeAliases) !== '') {
                $routeAliases = collect(explode(',', $routeAliases))
                    ->map(fn (string $alias): string => trim($alias))
                    ->filter()
                    ->values()
                    ->all();
            }

            $this->merge([
                'collection_type' => $this->input('collection_type', $this->input('type', 'manual') === 'automatic' ? 'smart' : 'manual'),
                'display_position_anchor' => $this->input('display_position_anchor', 'products'),
                'display_position_placement' => $this->input('display_position_placement', 'before'),
                'discount_enabled' => filter_var($this->input('discount_enabled', false), FILTER_VALIDATE_BOOL),
                'rules' => $rules,
                'route_aliases' => $routeAliases,
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
                            'stock_quantity',
                        ] as $field) {
                            if (! filled($variant[$field] ?? null)) {
                                $variant[$field] = null;

                                continue;
                            }

                            $variant[$field] = (int) $variant[$field];
                        }

                        $variant['track_inventory'] = array_key_exists('track_inventory', $variant) && $variant['track_inventory'] !== ''
                            ? filter_var($variant['track_inventory'], FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE)
                            : null;
                        $variant['status'] = filled($variant['status'] ?? null)
                            ? $variant['status']
                            : 'active';
                        $variant['sku'] = filled($variant['sku'] ?? null)
                            ? trim((string) $variant['sku'])
                            : null;

                        return $variant;
                    })
                    ->values()
                    ->all(),
            ]);
        }

        if ((string) $this->route('module') === 'products') {
            $this->merge([
                'currency' => strtoupper((string) ($this->input('currency') ?: $this->companyCurrency())),
            ]);
        }

        if ((string) $this->route('module') === 'discounts') {
            $this->merge([
                'code' => filled($this->input('code')) ? strtoupper(trim((string) $this->input('code'))) : null,
                'first_order_only' => filter_var($this->input('first_order_only', false), FILTER_VALIDATE_BOOL),
                'free_shipping' => filter_var($this->input('free_shipping', false), FILTER_VALIDATE_BOOL),
            ]);
        }

        if ((string) $this->route('module') === 'categories') {
            $this->merge([
                'is_featured' => filter_var($this->input('is_featured', false), FILTER_VALIDATE_BOOL),
                'show_on_home' => filter_var($this->input('show_on_home', false), FILTER_VALIDATE_BOOL),
                'show_in_navbar' => filter_var($this->input('show_in_navbar', false), FILTER_VALIDATE_BOOL),
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
                'icon_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:1024'],
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
                'cta_url' => ['nullable', 'string', 'max:255', $this->absoluteUrlOrRelativePath()],
                'route_aliases' => ['nullable', 'array'],
                'route_aliases.*' => ['string', 'max:255'],
                'meta_title' => ['nullable', 'string', 'max:255'],
                'meta_description' => ['nullable', 'string'],
                'meta_keywords' => ['nullable', 'string'],
                'canonical_url' => ['nullable', 'string', 'max:255', $this->absoluteUrlOrRelativePath()],
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
                'products' => ['nullable', 'array'],
                'products.*' => ['integer', 'exists:products,id'],
                'categories' => ['nullable', 'array'],
                'categories.*' => ['integer', 'exists:categories,id'],
                'brands' => ['nullable', 'array'],
                'brands.*' => ['integer', 'exists:brands,id'],
                'collections' => ['nullable', 'array'],
                'collections.*' => ['integer', 'exists:collections,id'],
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
        if ((string) $this->route('module') === 'products') {
            $validator->after(function (Validator $validator): void {
                $seen = [];
                $seenSkus = [];
                $variants = (array) $this->input('variants', []);
                $productId = (int) ($this->route('id') ?: 0);
                $product = $productId ? Product::query()->find($productId) : null;
                $valueIds = collect($variants)
                    ->flatMap(fn ($variant) => is_array($variant) ? ($variant['attribute_values'] ?? []) : [])
                    ->map(fn ($id): int => (int) $id)
                    ->filter()
                    ->unique()
                    ->values();
                $attributeIdsByValue = ProductAttributeValue::query()
                    ->whereIn('id', $valueIds)
                    ->whereHas('attribute', fn ($query) => $query->where('is_variant_defining', true))
                    ->pluck('attribute_id', 'id');

                foreach ($variants as $index => $variant) {
                    if (! is_array($variant)) {
                        continue;
                    }

                    $ids = collect($variant['attribute_values'] ?? [])
                        ->map(fn ($id): int => (int) $id)
                        ->filter()
                        ->unique()
                        ->sort()
                        ->values();

                    if ($ids->isEmpty()) {
                        $validator->errors()->add("variants.{$index}.attribute_values", 'Each variant must have at least one attribute value.');

                        continue;
                    }

                    if ($ids->count() !== $attributeIdsByValue->only($ids)->count()) {
                        $validator->errors()->add("variants.{$index}.attribute_values", 'Variants may only use variant-defining attribute values.');
                    }

                    $attributeIds = $ids->map(fn (int $id) => $attributeIdsByValue->get($id))->filter();
                    if ($attributeIds->count() !== $attributeIds->unique()->count()) {
                        $validator->errors()->add("variants.{$index}.attribute_values", 'A variant may contain only one value from each attribute.');
                    }

                    $key = $ids->implode(':');
                    if (isset($seen[$key])) {
                        $validator->errors()->add("variants.{$index}.attribute_values", 'Duplicate variant combinations are not allowed.');
                    }

                    $seen[$key] = true;

                    if (($variant['status'] ?? 'active') === 'active' && ! filled($variant['price_cents'] ?? null)) {
                        $validator->errors()->add("variants.{$index}.price_cents", 'An active variant must have a price.');
                    }

                    if (($variant['status'] ?? 'active') === 'active'
                        && (bool) ($variant['track_inventory'] ?? true)
                        && ! filled($variant['stock_quantity'] ?? null)
                    ) {
                        $validator->errors()->add("variants.{$index}.stock_quantity", 'Stock quantity is required when variant inventory is tracked.');
                    }

                    if (filled($variant['price_cents'] ?? null)
                        && filled($variant['compare_at_price_cents'] ?? null)
                        && (int) $variant['compare_at_price_cents'] < (int) $variant['price_cents']
                    ) {
                        $validator->errors()->add("variants.{$index}.compare_at_price_cents", 'Compare price must be greater than or equal to the variant price.');
                    }

                    $sku = strtoupper(trim((string) ($variant['sku'] ?? '')));
                    if ($sku !== '') {
                        if (isset($seenSkus[$sku])) {
                            $validator->errors()->add("variants.{$index}.sku", 'Variant SKUs must be unique.');
                        }
                        $seenSkus[$sku] = true;

                        if (Product::query()->where('sku', $sku)->when($product, fn ($query) => $query->whereKeyNot($product->id))->exists()) {
                            $validator->errors()->add("variants.{$index}.sku", 'This SKU is already used by another product.');
                        }

                        $existingVariant = $product?->variants()
                            ->withTrashed()
                            ->where('combination_key', $key)
                            ->first();
                        if (ProductVariant::query()
                            ->withTrashed()
                            ->where('sku', $sku)
                            ->when($existingVariant, fn ($query) => $query->whereKeyNot($existingVariant->id))
                            ->exists()
                        ) {
                            $validator->errors()->add("variants.{$index}.sku", 'This SKU is already used by another variant.');
                        }
                    }
                }

                if ($variants === [] && ! filled($this->input('base_price_cents'))) {
                    $validator->errors()->add('base_price_cents', 'Regular price is required for a product without variants.');
                }

                if ($variants !== [] && collect($variants)->where('status', 'active')->isEmpty()) {
                    $validator->errors()->add('variants', 'A variant product must have at least one active sellable SKU.');
                }
            });
        }

        if ((string) $this->route('module') !== 'categories') {
            return;
        }

        $validator->after(function (Validator $validator): void {
            $mode = app(CategoryDisplaySettingsService::class)->get()->category_display_mode
                ?: CategoryDisplaySettingsService::MODE_LANDING_PAGE;

            if ($mode === CategoryDisplaySettingsService::MODE_HOME_GRID_NAVBAR_DROPDOWN
                && ! filled($this->input('icon'))
                && ! $this->hasFile('icon_file')
                && ! $this->hasExistingCategoryIcon()
            ) {
                $validator->errors()->add('icon_file', 'The icon field is required for the selected category display mode.');
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

    private function absoluteUrlOrRelativePath(): \Closure
    {
        return static function (string $attribute, mixed $value, \Closure $fail): void {
            if ($value === null || $value === '') {
                return;
            }

            $value = trim((string) $value);
            $scheme = parse_url($value, PHP_URL_SCHEME);
            $isAbsoluteUrl = filter_var($value, FILTER_VALIDATE_URL) !== false
                && in_array($scheme, ['http', 'https'], true);
            $isRelativePath = str_starts_with($value, '/')
                && ! str_starts_with($value, '//')
                && ! preg_match('/[\r\n]/', $value);

            if (! $isAbsoluteUrl && ! $isRelativePath) {
                $fail("The {$attribute} field must be a valid URL or relative path.");
            }
        };
    }

    private function hasExistingCategoryIcon(): bool
    {
        $id = $this->route('id');

        return $id
            ? Category::query()->whereKey($id)->whereNotNull('icon')->where('icon', '!=', '')->exists()
            : false;
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
            'base_price_cents' => ['nullable', 'integer', 'min:0'],
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
            'seo.canonical_url' => ['nullable', 'url', 'max:255'],
            'seo.og_image_url' => ['nullable', 'string'],
            'seo.schema_json' => ['nullable', 'array'],
            'variants' => ['nullable', 'array'],
            'variants.*.sku' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9][A-Za-z0-9._-]*$/'],
            'variants.*.price_cents' => ['nullable', 'integer', 'min:0'],
            'variants.*.compare_at_price_cents' => ['nullable', 'integer', 'min:0'],
            'variants.*.cost_price_cents' => ['nullable', 'integer', 'min:0'],
            'variants.*.stock_quantity' => ['nullable', 'integer', 'min:0'],
            'variants.*.track_inventory' => ['required_with:variants', 'boolean'],
            'variants.*.status' => ['required_with:variants', Rule::in(['active', 'inactive'])],
            'variants.*.attribute_values' => ['required_with:variants', 'array', 'min:1'],
            'variants.*.attribute_values.*' => ['integer', 'exists:attribute_values,id'],
        ];
    }

    private function companyCurrency(): string
    {
        $company = CompanySetting::query()->with('currency')->first();

        return $company?->currency?->currency ?: 'BDT';
    }
}
