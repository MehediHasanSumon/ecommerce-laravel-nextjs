<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SearchClick extends Model
{
    public $timestamps = false;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'clicked_at' => 'datetime',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(SearchEvent::class, 'search_event_id');
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(SearchTerm::class, 'search_term_id');
    }
}
