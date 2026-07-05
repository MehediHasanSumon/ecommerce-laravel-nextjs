<?php

namespace App\Models\Settings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enable_reviews' => 'boolean',
            'enable_wishlist' => 'boolean',
            'enable_compare' => 'boolean',
            'enable_stock_management' => 'boolean',
            'enable_guest_checkout' => 'boolean',
            'require_login_before_checkout' => 'boolean',
            'allow_backorders' => 'boolean',
            'hide_out_of_stock_products' => 'boolean',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
