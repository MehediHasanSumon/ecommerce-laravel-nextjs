<?php

namespace App\Models\Settings;

use App\Models\FraudProviderResult;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FraudProviderSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'sandbox_mode' => 'boolean',
            'api_key' => 'encrypted',
            'api_secret' => 'encrypted',
            'additional_configuration' => 'array',
            'last_successful_connection_at' => 'datetime',
            'last_connection_attempt_at' => 'datetime',
            'circuit_open_until' => 'datetime',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function results(): HasMany
    {
        return $this->hasMany(FraudProviderResult::class);
    }
}
