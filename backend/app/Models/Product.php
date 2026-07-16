<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'track_inventory' => 'boolean',
            'is_featured' => 'boolean',
            'is_new' => 'boolean',
            'is_best_seller' => 'boolean',
            'is_flash_sale' => 'boolean',
            'free_shipping' => 'boolean',
            'rating_average' => 'decimal:2',
            'flash_sale_ends_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function activeVariants(): HasMany
    {
        return $this->variants()->where('status', 'active');
    }

    public function cheapestActiveVariant(): HasOne
    {
        return $this->hasOne(ProductVariant::class)
            ->ofMany(
                ['price_cents' => 'min', 'id' => 'min'],
                fn ($query) => $query
                    ->where('status', 'active')
                    ->whereNotNull('price_cents')
                    ->where(fn ($availabilityQuery) => $availabilityQuery
                        ->where('track_inventory', false)
                        ->orWhere('stock_quantity', '>', 0))
            );
    }

    public function scopeWithSellableVariantMetrics($query)
    {
        return $query
            ->with([
                'cheapestActiveVariant' => fn ($variantQuery) => $variantQuery->select([
                    'product_variants.id',
                    'product_variants.product_id',
                    'product_variants.sku',
                    'product_variants.price_cents',
                    'product_variants.compare_at_price_cents',
                    'product_variants.stock_quantity',
                    'product_variants.track_inventory',
                    'product_variants.status',
                ]),
            ])
            ->withCount([
                'activeVariants as active_variants_count',
                'activeVariants as available_variants_count' => fn ($variantQuery) => $variantQuery
                    ->where(fn ($availabilityQuery) => $availabilityQuery
                        ->where('track_inventory', false)
                        ->orWhere('stock_quantity', '>', 0)),
            ])
            ->withSum('activeVariants as active_variants_stock', 'stock_quantity');
    }

    public function scopeWhereSellableAvailable($query)
    {
        return $query->where(fn ($availabilityQuery) => $availabilityQuery
            ->whereHas('activeVariants', fn ($variantQuery) => $variantQuery
                ->where(fn ($stockQuery) => $stockQuery
                    ->where('track_inventory', false)
                    ->orWhere('stock_quantity', '>', 0)))
            ->orWhere(fn ($simpleQuery) => $simpleQuery
                ->whereDoesntHave('variants')
                ->where(fn ($stockQuery) => $stockQuery
                    ->where('track_inventory', false)
                    ->orWhere('stock_quantity', '>', 0))));
    }

    public function features(): HasMany
    {
        return $this->hasMany(ProductFeature::class);
    }

    public function specifications(): HasMany
    {
        return $this->hasMany(ProductSpecification::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    public function seo(): HasOne
    {
        return $this->hasOne(ProductSeo::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class)->withTimestamps();
    }

    public function attributeValues(): BelongsToMany
    {
        return $this->belongsToMany(ProductAttributeValue::class, 'product_attribute_value', 'product_id', 'attribute_value_id')
            ->withPivot('attribute_id')
            ->withTimestamps();
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(ProductCollection::class, 'product_collection_product', 'product_id', 'product_collection_id')
            ->withPivot('sort_order')
            ->withTimestamps();
    }

    public function discounts(): BelongsToMany
    {
        return $this->belongsToMany(Discount::class)->withTimestamps();
    }

    public function relatedProducts(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'product_relations', 'product_id', 'related_product_id')
            ->withPivot(['type', 'sort_order'])
            ->withTimestamps();
    }
}
