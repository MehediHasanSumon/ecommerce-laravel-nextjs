<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SearchTerm extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'search_count' => 'integer',
            'zero_result_count' => 'integer',
            'unique_user_count' => 'integer',
            'click_count' => 'integer',
            'conversion_count' => 'integer',
            'last_searched_at' => 'datetime',
        ];
    }

    public function events(): HasMany
    {
        return $this->hasMany(SearchEvent::class);
    }
}
