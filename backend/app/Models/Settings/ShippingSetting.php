<?php

namespace App\Models\Settings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippingSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enable_shipping' => 'boolean',
            'enable_free_shipping' => 'boolean',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
