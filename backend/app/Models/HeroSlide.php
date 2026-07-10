<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class HeroSlide extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'overlay' => 'boolean',
            'overlay_opacity' => 'integer',
            'background_overlay' => 'boolean',
            'canvas_overlay_opacity' => 'integer',
            'canvas_size' => 'array',
            'status' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function elements(): HasMany
    {
        return $this->hasMany(HeroSlideElement::class)->orderBy('z_index')->orderBy('id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', true);
    }
}
