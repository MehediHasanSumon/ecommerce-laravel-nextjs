<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HeroSlideResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'background_image' => $this->background_image,
            'mobile_image' => $this->mobile_image,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'description' => $this->description,
            'primary_button_text' => $this->primary_button_text,
            'primary_button_url' => $this->primary_button_url,
            'secondary_button_text' => $this->secondary_button_text,
            'secondary_button_url' => $this->secondary_button_url,
            'text_alignment' => $this->text_alignment,
            'overlay' => (bool) $this->overlay,
            'overlay_opacity' => (int) $this->overlay_opacity,
            'background_color' => $this->background_color,
            'background_gradient' => $this->background_gradient,
            'background_overlay' => (bool) $this->background_overlay,
            'canvas_overlay_opacity' => (int) $this->canvas_overlay_opacity,
            'canvas_size' => $this->canvas_size,
            'status' => (bool) $this->status,
            'sort_order' => (int) $this->sort_order,
            'elements' => HeroSlideElementResource::collection($this->whenLoaded('elements'))->resolve(),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
