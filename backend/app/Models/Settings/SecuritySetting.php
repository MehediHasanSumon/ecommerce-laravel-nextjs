<?php

namespace App\Models\Settings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SecuritySetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'auto_blocking_enabled' => 'boolean',
            'max_failed_login_attempts' => 'integer',
            'max_password_reset_attempts' => 'integer',
            'max_otp_attempts' => 'integer',
            'max_registration_attempts' => 'integer',
            'max_api_requests' => 'integer',
            'max_checkout_requests' => 'integer',
            'max_contact_submissions' => 'integer',
            'max_invalid_auth_attempts' => 'integer',
            'max_payment_failures' => 'integer',
            'failed_cod_threshold' => 'integer',
            'max_not_found_requests' => 'integer',
            'max_bot_requests' => 'integer',
            'time_window_minutes' => 'integer',
            'temporary_block_duration_minutes' => 'integer',
            'permanent_block_threshold' => 'integer',
            'auto_block_critical_ips' => 'boolean',
            'enable_checkout_security' => 'boolean',
            'enable_cod_security' => 'boolean',
            'enable_payment_security' => 'boolean',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
