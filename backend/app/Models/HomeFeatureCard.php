<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class HomeFeatureCard extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    public function scopeActive($query)
    {
        return $query->where('status', true);
    }

    protected function casts(): array
    {
        return [
            'status' => 'boolean',
        ];
    }
}
