<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'featured_image' => $this->featured_image,
            'excerpt' => $this->excerpt,
            'content' => $this->content,
            'meta_title' => $this->meta_title,
            'meta_description' => $this->meta_description,
            'meta_keywords' => $this->meta_keywords,
            'canonical_url' => $this->canonical_url,
            'open_graph_image' => $this->open_graph_image,
            'author_id' => $this->author_id,
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author?->id,
                'name' => $this->author?->name,
                'email' => $this->author?->email,
            ]),
            'status' => $this->status,
            'published_at' => optional($this->published_at)->toISOString(),
            'scheduled_publish_at' => optional($this->scheduled_publish_at)->toISOString(),
            'featured' => (bool) $this->featured,
            'allow_comments_override' => $this->allow_comments_override,
            'views_count' => (int) $this->views_count,
            'reading_time_minutes' => (int) $this->reading_time_minutes,
            'approved_comments_count' => (int) ($this->approved_comments_count ?? 0),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
