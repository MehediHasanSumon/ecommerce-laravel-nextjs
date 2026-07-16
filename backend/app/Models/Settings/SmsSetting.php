<?php

namespace App\Models\Settings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'provider_configuration' => 'array',
            'api_key' => 'encrypted',
            'api_secret' => 'encrypted',
            'username' => 'encrypted',
            'password' => 'encrypted',
            'require_guest_checkout_otp' => 'boolean',
            'require_registered_checkout_otp' => 'boolean',
            'order_confirmation_enabled' => 'boolean',
            'order_status_events' => 'array',
            'shipping_status_events' => 'array',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
