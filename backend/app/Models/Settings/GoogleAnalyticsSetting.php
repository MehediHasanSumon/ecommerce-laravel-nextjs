<?php

namespace App\Models\Settings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoogleAnalyticsSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'api_secret' => 'encrypted',
            'enhanced_ecommerce' => 'boolean',
            'debug_mode' => 'boolean',
            'user_id_tracking' => 'boolean',
            'server_side_events' => 'boolean',
            'client_side_events' => 'boolean',
            'anonymize_ip' => 'boolean',
            'respect_consent_mode' => 'boolean',
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
