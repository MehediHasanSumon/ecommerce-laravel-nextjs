<?php

namespace App\Models\Settings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaPixelSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'conversions_api_enabled' => 'boolean',
            'access_token' => 'encrypted',
            'test_event_code' => 'encrypted',
            'automatic_event_tracking' => 'boolean',
            'advanced_matching' => 'boolean',
            'server_side_tracking' => 'boolean',
            'browser_side_tracking' => 'boolean',
            'debug_mode' => 'boolean',
            'last_successful_event_at' => 'datetime',
            'last_connection_attempt_at' => 'datetime',
            'last_response' => 'encrypted:array',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
