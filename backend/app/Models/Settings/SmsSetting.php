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
            'api_key' => 'encrypted',
            'api_secret' => 'encrypted',
            'require_guest_checkout_otp' => 'boolean',
            'require_registered_checkout_otp' => 'boolean',
            'otp_length' => 'integer',
            'otp_expiration_minutes' => 'integer',
            'order_confirmation_enabled' => 'boolean',
            'order_status_events' => 'array',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
