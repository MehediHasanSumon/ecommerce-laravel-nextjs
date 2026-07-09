<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogDetailResource extends JsonResource
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
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author?->id,
                'name' => $this->author?->name,
            ]),
            'published_at' => optional($this->published_at)->toISOString(),
            'reading_time_minutes' => (int) $this->reading_time_minutes,
            'views_count' => (int) $this->views_count,
            'allow_comments_override' => $this->allow_comments_override,
            'comments' => BlogCommentResource::collection($this->whenLoaded('approvedComments'))->resolve(),
        ];
    }
}
