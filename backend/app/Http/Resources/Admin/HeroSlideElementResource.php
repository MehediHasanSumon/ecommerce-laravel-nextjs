<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HeroSlideElementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'name' => $this->name,
            'content' => $this->content ?: [],
            'style' => $this->style ?: [],
            'responsive' => $this->responsive ?: [],
            'animation' => $this->animation ?: [],
            'z_index' => (int) $this->z_index,
            'locked' => (bool) $this->locked,
            'hidden' => (bool) $this->hidden,
        ];
    }
}
