<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FraudCheck extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'input_payload' => 'encrypted:array',
            'is_automatic' => 'boolean',
            'is_flagged' => 'boolean',
            'blacklist_status' => 'boolean',
            'risk_reasons' => 'array',
            'decision' => 'array',
            'checked_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function guestCustomer(): BelongsTo
    {
        return $this->belongsTo(GuestCustomer::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    public function cachedFrom(): BelongsTo
    {
        return $this->belongsTo(self::class, 'cached_from_id');
    }

    public function providerResults(): HasMany
    {
        return $this->hasMany(FraudProviderResult::class);
    }

    public function apiLogs(): HasMany
    {
        return $this->hasMany(FraudApiLog::class);
    }
}
