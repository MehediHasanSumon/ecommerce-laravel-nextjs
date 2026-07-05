<?php

namespace App\Models\Settings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
            'queue_emails' => 'boolean',
            'enabled' => 'boolean',
            'last_tested_at' => 'datetime',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
