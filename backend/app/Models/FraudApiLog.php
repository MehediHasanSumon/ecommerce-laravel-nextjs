<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FraudApiLog extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'request_payload' => 'encrypted:array',
            'response_payload' => 'encrypted:array',
        ];
    }

    public function fraudCheck(): BelongsTo
    {
        return $this->belongsTo(FraudCheck::class);
    }
}
