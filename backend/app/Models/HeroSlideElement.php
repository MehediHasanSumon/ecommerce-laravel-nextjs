<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class HeroSlideElement extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'style' => 'array',
            'responsive' => 'array',
            'animation' => 'array',
            'z_index' => 'integer',
            'locked' => 'boolean',
            'hidden' => 'boolean',
        ];
    }

    public function slide(): BelongsTo
    {
        return $this->belongsTo(HeroSlide::class, 'hero_slide_id');
    }
}
