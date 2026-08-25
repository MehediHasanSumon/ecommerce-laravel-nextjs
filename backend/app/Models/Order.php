<?php

namespace App\Models;

use App\Models\Settings\ShippingMethod;
use App\Models\Settings\ShippingZone;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'billing_address' => 'array',
            'shipping_address' => 'array',
            'summary_snapshot' => 'array',
            'coupon_snapshot' => 'array',
            'placed_at' => 'datetime',
            'fraud_score' => 'integer',
            'fraud_checked_at' => 'datetime',
            'fraud_flagged' => 'boolean',
            'fraud_hold' => 'boolean',
            'fraud_cod_blocked' => 'boolean',
            'fraud_approved_at' => 'datetime',
            'inventory_released_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function guestCustomer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function shippingMethod(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class);
    }

    public function shippingZone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(OrderRefund::class);
    }

    public function shippingLogs(): HasMany
    {
        return $this->hasMany(ShippingLog::class);
    }

    public function courierShipments(): HasMany
    {
        return $this->hasMany(CourierShipment::class);
    }

    public function fraudChecks(): HasMany
    {
        return $this->hasMany(FraudCheck::class);
    }

    public function latestFraudCheck(): BelongsTo
    {
        return $this->belongsTo(FraudCheck::class, 'latest_fraud_check_id');
    }

    public function fraudApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fraud_approved_by');
    }
}
