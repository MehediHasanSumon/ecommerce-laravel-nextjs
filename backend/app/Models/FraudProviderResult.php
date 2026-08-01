<?php

namespace App\Models;

use App\Models\Settings\FraudProviderSetting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FraudProviderResult extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'blacklist_status' => 'boolean',
            'risk_reasons' => 'array',
            'raw_response' => 'encrypted:array',
        ];
    }

    public function fraudCheck(): BelongsTo
    {
        return $this->belongsTo(FraudCheck::class);
    }

    public function setting(): BelongsTo
    {
        return $this->belongsTo(FraudProviderSetting::class, 'fraud_provider_setting_id');
    }
}
