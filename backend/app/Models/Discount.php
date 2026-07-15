<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Discount extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'first_order_only' => 'boolean',
            'free_shipping' => 'boolean',
            'stackable' => 'boolean',
        ];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class)->withTimestamps();
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'discount_category', 'discount_id', 'category_id')->withTimestamps();
    }

    public function brands(): BelongsToMany
    {
        return $this->belongsToMany(Brand::class, 'discount_brand')->withTimestamps();
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductCollection::class,
            'discount_collection',
            'discount_id',
            'product_collection_id'
        )->withTimestamps();
    }

    public function excludedProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'discount_excluded_product')->withTimestamps();
    }

    public function excludedCategories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'discount_excluded_category', 'discount_id', 'category_id')->withTimestamps();
    }

    public function usages(): HasMany
    {
        return $this->hasMany(DiscountUserUsage::class);
    }
}
