<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'featured_image' => $this->featured_image,
            'excerpt' => $this->excerpt,
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author?->id,
                'name' => $this->author?->name,
            ]),
            'published_at' => optional($this->published_at)->toISOString(),
            'reading_time_minutes' => (int) $this->reading_time_minutes,
            'views_count' => (int) $this->views_count,
            'featured' => (bool) $this->featured,
        ];
    }
}
