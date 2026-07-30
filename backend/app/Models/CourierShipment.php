<?php

namespace App\Models;

use App\Models\Settings\CourierProviderSetting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourierShipment extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'weight' => 'decimal:2',
            'provider_payload' => 'array',
            'provider_response' => 'array',
            'estimated_delivery_at' => 'datetime',
            'shipment_created_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'delivered_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function setting(): BelongsTo
    {
        return $this->belongsTo(CourierProviderSetting::class, 'courier_provider_setting_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(CourierShipmentEvent::class);
    }

    public function apiLogs(): HasMany
    {
        return $this->hasMany(CourierApiLog::class);
    }
}
