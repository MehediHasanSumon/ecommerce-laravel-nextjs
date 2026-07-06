<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogCommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'author_name' => $this->author_name,
            'content' => $this->content,
            'created_at' => optional($this->created_at)->toISOString(),
            'replies' => $this->relationLoaded('replies')
                ? BlogCommentResource::collection($this->replies)->resolve()
                : [],
        ];
    }
}
