<?php

namespace App\Models\Settings;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ShippingZone extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'countries' => 'array',
            'states' => 'array',
            'postal_codes' => 'array',
            'status' => 'boolean',
        ];
    }

    public function methods(): HasMany
    {
        return $this->hasMany(ShippingMethod::class);
    }
}
