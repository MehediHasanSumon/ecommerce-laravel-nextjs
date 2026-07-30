<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecurityAttempt extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'triggered_block' => 'boolean',
            'metadata' => 'array',
            'occurred_at' => 'datetime',
        ];
    }
}
