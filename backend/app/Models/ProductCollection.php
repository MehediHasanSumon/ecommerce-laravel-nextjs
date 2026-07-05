<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductCollection extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'collections';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'rules' => 'array',
            'route_aliases' => 'array',
            'is_system' => 'boolean',
            'is_featured' => 'boolean',
            'show_on_home' => 'boolean',
            'discount_enabled' => 'boolean',
        ];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_collection_product', 'product_collection_id', 'product_id')
            ->withPivot('sort_order')
            ->withTimestamps();
    }
}
