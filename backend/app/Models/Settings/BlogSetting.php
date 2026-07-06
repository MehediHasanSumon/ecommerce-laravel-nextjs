<?php

namespace App\Models\Settings;

use Illuminate\Database\Eloquent\Model;

class BlogSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'list_enable_thumbnail' => 'boolean',
            'list_show_excerpt' => 'boolean',
            'list_show_author' => 'boolean',
            'list_show_published_date' => 'boolean',
            'list_show_reading_time' => 'boolean',
            'show_on_home' => 'boolean',
            'home_limit' => 'integer',
            'allow_comments' => 'boolean',
            'enable_related' => 'boolean',
            'enable_search' => 'boolean',
        ];
    }
}
