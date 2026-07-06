<?php

namespace App\Http\Resources\Admin\Settings;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'enabled' => (bool) $this->enabled,
            'layout' => $this->layout,
            'list_enable_thumbnail' => (bool) $this->list_enable_thumbnail,
            'list_show_excerpt' => (bool) $this->list_show_excerpt,
            'list_show_author' => (bool) $this->list_show_author,
            'list_show_published_date' => (bool) $this->list_show_published_date,
            'list_show_reading_time' => (bool) $this->list_show_reading_time,
            'show_on_home' => (bool) $this->show_on_home,
            'home_limit' => (int) $this->home_limit,
            'allow_comments' => (bool) $this->allow_comments,
            'enable_related' => (bool) $this->enable_related,
            'enable_search' => (bool) $this->enable_search,
            'default_meta_title' => $this->default_meta_title,
            'default_meta_description' => $this->default_meta_description,
            'open_graph_image' => $this->open_graph_image,
            'canonical_url' => $this->canonical_url,
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
