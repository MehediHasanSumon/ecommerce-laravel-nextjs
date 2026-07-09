<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContentPageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'description' => $this->description,
            'template' => $this->template,
            'payload' => $this->payload ?: [],
            'seo' => [
                'title' => $this->meta_title ?: $this->title,
                'description' => $this->meta_description ?: $this->description,
                'keywords' => $this->meta_keywords,
                'canonicalUrl' => $this->canonical_url ?: url("/{$this->slug}"),
                'ogTitle' => $this->og_title ?: $this->meta_title,
                'ogDescription' => $this->og_description ?: $this->meta_description,
                'ogImage' => $this->og_image_url,
            ],
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
