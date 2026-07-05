<?php

namespace App\Models;

use App\Models\Settings\CompanySetting;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Currency extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function companySettings(): HasMany
    {
        return $this->hasMany(CompanySetting::class);
    }
}
