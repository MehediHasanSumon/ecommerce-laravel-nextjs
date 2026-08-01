<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductVariant extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'track_inventory' => 'boolean',
        'is_primary' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function attributeValues(): BelongsToMany
    {
        return $this->belongsToMany(ProductAttributeValue::class, 'product_variant_attribute_value', 'product_variant_id', 'attribute_value_id')
            ->withPivot('attribute_id')
            ->withTimestamps();
    }

    public function effectivePriceCents(): ?int
    {
        return $this->product?->effectivePriceCents($this);
    }

    public function effectiveCompareAtPriceCents(): ?int
    {
        return $this->product?->effectiveCompareAtPriceCents($this);
    }

    public function effectiveCostPriceCents(): ?int
    {
        return $this->product?->effectiveCostPriceCents($this);
    }
}
