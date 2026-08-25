<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function getPhoneAttribute(): ?string
    {
        return $this->mobile;
    }

    public function getTotalDueAttribute(): float
    {
        return round($this->total_due_cents / 100, 2);
    }

    public function getTotalDueCentsAttribute(): int
    {
        return (int) $this->orders()
            ->whereNotIn('status', ['cancelled'])
            ->whereNotIn('payment_status', ['paid', 'refunded'])
            ->sum('total_cents');
    }

    public function getTotalSpentAttribute(): float
    {
        return round($this->total_spent_cents / 100, 2);
    }

    public function getTotalSpentCentsAttribute(): int
    {
        return (int) $this->orders()
            ->where('payment_status', 'paid')
            ->sum('total_cents');
    }
}
