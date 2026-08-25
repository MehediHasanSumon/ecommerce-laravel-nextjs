<?php

namespace App\Services\Admin;

use App\Models\HeroSlide;
use App\Models\HeroSlideElement;
use App\Models\Settings\HeroSetting;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class HeroSectionService
{
    public function settings(): HeroSetting
    {
        return HeroSetting::query()->firstOrCreate([], $this->defaultSettings());
    }

    public function updateSettings(array $data, ?int $userId = null): HeroSetting
    {
        $settings = $this->settings();
        $settings->fill([...$data, 'updated_by' => $userId])->save();
        $this->clearCaches();
        Log::info('Hero settings updated.', ['user_id' => $userId]);

        return $this->settings();
    }

    public function slides(bool $withInactive = true): Collection
    {
        return HeroSlide::query()
            ->when(! $withInactive, fn ($query) => $query->active())
            ->with('elements')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    public function createSlide(array $data, ?int $userId = null): HeroSlide
    {
        return DB::transaction(function () use ($data, $userId): HeroSlide {
            $elements = $data['elements'] ?? [];
            unset($data['elements']);

            $slide = HeroSlide::query()->create([
                ...$data,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $this->syncElements($slide, $elements, $userId);
            $this->clearCaches();
            Log::info('Hero slide created.', ['id' => $slide->id, 'user_id' => $userId]);

            return $slide->fresh('elements');
        });
    }

    public function updateSlide(HeroSlide $slide, array $data, ?int $userId = null): HeroSlide
    {
        return DB::transaction(function () use ($slide, $data, $userId): HeroSlide {
            $elements = $data['elements'] ?? null;
            unset($data['elements']);

            $slide->fill([...$data, 'updated_by' => $userId])->save();

            if (is_array($elements)) {
                $this->syncElements($slide, $elements, $userId);
            }

            $this->clearCaches();
            Log::info('Hero slide updated.', ['id' => $slide->id, 'user_id' => $userId]);

            return $slide->fresh('elements');
        });
    }

    public function duplicateSlide(HeroSlide $slide, ?int $userId = null): HeroSlide
    {
        return DB::transaction(function () use ($slide, $userId): HeroSlide {
            $copy = $slide->replicate(['created_at', 'updated_at', 'deleted_at']);
            $copy->name = trim(($slide->name ?: 'Hero Slide').' Copy');
            $copy->sort_order = ((int) HeroSlide::query()->max('sort_order')) + 1;
            $copy->created_by = $userId;
            $copy->updated_by = $userId;
            $copy->save();

            foreach ($slide->elements as $element) {
                $elementCopy = $element->replicate(['created_at', 'updated_at', 'deleted_at']);
                $elementCopy->hero_slide_id = $copy->id;
                $elementCopy->created_by = $userId;
                $elementCopy->updated_by = $userId;
                $elementCopy->save();
            }

            $this->clearCaches();
            Log::info('Hero slide duplicated.', ['id' => $slide->id, 'copy_id' => $copy->id, 'user_id' => $userId]);

            return $copy->fresh('elements');
        });
    }

    public function deleteSlide(HeroSlide $slide, ?int $userId = null): void
    {
        $slide->delete();
        $this->clearCaches();
        Log::info('Hero slide deleted.', ['id' => $slide->id, 'user_id' => $userId]);
    }

    public function reorder(array $slides, ?int $userId = null): Collection
    {
        return DB::transaction(function () use ($slides, $userId): Collection {
            foreach ($slides as $slide) {
                HeroSlide::query()->whereKey($slide['id'])->update([
                    'sort_order' => $slide['sort_order'],
                    'updated_by' => $userId,
                    'updated_at' => now(),
                ]);
            }

            $this->clearCaches();
            Log::info('Hero slides reordered.', ['count' => count($slides), 'user_id' => $userId]);

            return $this->slides();
        });
    }

    public function runtime(): array
    {
        return Cache::remember('hero.runtime.v1', now()->addMinutes(10), function (): array {
            $settings = $this->settings();

            return [
                'settings' => $this->settingsPayload($settings),
                'slides' => $settings->enabled
                    ? $this->slides(false)->map(fn (HeroSlide $slide): array => $this->slidePayload($slide, true))->values()->all()
                    : [],
            ];
        });
    }

    public function upload(UploadedFile $file): string
    {
        $path = $file->store('hero-section', 'public');

        $this->clearCaches();

        return Storage::disk('public')->url($path);
    }

    public function adminPayload(): array
    {
        return [
            'settings' => $this->settingsPayload($this->settings()),
            'slides' => $this->slides()->map(fn (HeroSlide $slide): array => $this->slidePayload($slide))->values()->all(),
        ];
    }

    public function settingsPayload(HeroSetting $settings): array
    {
        return [
            'enabled' => (bool) $settings->enabled,
            'mode' => $settings->mode,
            'slider_autoplay' => (bool) $settings->slider_autoplay,
            'autoplay_delay' => (int) $settings->autoplay_delay,
            'infinite_loop' => (bool) $settings->infinite_loop,
            'show_navigation' => (bool) $settings->show_navigation,
            'show_pagination' => (bool) $settings->show_pagination,
            'swipe_support' => (bool) $settings->swipe_support,
            'pause_on_hover' => (bool) $settings->pause_on_hover,
            'lazy_load_images' => (bool) $settings->lazy_load_images,
        ];
    }

    private function slidePayload(HeroSlide $slide, bool $runtime = false): array
    {
        return [
            'id' => $slide->id,
            'name' => $slide->name,
            'background_image' => $this->assetUrl($slide->background_image),
            'mobile_image' => $this->assetUrl($slide->mobile_image),
            'title' => $slide->title,
            'subtitle' => $slide->subtitle,
            'description' => $slide->description,
            'primary_button_text' => $slide->primary_button_text,
            'primary_button_url' => $slide->primary_button_url,
            'secondary_button_text' => $slide->secondary_button_text,
            'secondary_button_url' => $slide->secondary_button_url,
            'text_alignment' => $slide->text_alignment,
            'overlay' => (bool) $slide->overlay,
            'overlay_opacity' => (int) $slide->overlay_opacity,
            'background_color' => $slide->background_color,
            'background_gradient' => $slide->background_gradient,
            'background_overlay' => (bool) $slide->background_overlay,
            'canvas_overlay_opacity' => (int) $slide->canvas_overlay_opacity,
            'canvas_size' => $slide->canvas_size ?: ['desktop' => ['width' => 1280, 'height' => 620], 'tablet' => ['width' => 768, 'height' => 560], 'mobile' => ['width' => 390, 'height' => 480]],
            'status' => (bool) $slide->status,
            'sort_order' => (int) $slide->sort_order,
            'enable_device_content' => (bool) $slide->enable_device_content,
            'device_content' => $slide->device_content ?: [
                'desktop' => [],
                'tablet' => [],
                'mobile' => [],
            ],
            'elements' => $slide->elements
                ->when($runtime, fn ($items) => $items->where('hidden', false))
                ->map(fn (HeroSlideElement $element): array => [
                    'id' => $element->id,
                    'type' => $element->type,
                    'name' => $element->name,
                    'content' => $element->content ?: [],
                    'style' => $element->style ?: [],
                    'responsive' => $element->responsive ?: [],
                    'z_index' => (int) $element->z_index,
                    'locked' => (bool) $element->locked,
                    'hidden' => (bool) $element->hidden,
                ])
                ->values()
                ->all(),
        ];
    }

    private function syncElements(HeroSlide $slide, array $elements, ?int $userId): void
    {
        $kept = [];

        foreach ($elements as $element) {
            $id = $element['id'] ?? null;
            unset($element['id']);
            $payload = [
                ...$element,
                'updated_by' => $userId,
            ];

            if ($id) {
                $model = $slide->elements()->whereKey($id)->first();
                if ($model) {
                    $model->fill($payload)->save();
                    $kept[] = $model->id;

                    continue;
                }
            }

            $created = $slide->elements()->create([...$payload, 'created_by' => $userId]);
            $kept[] = $created->id;
        }

        $slide->elements()->when($kept, fn ($query) => $query->whereNotIn('id', $kept))->delete();
    }

    private function defaultSettings(): array
    {
        return [
            'enabled' => true,
            'mode' => 'simple',
            'slider_autoplay' => true,
            'autoplay_delay' => 6000,
            'infinite_loop' => true,
            'show_navigation' => true,
            'show_pagination' => true,
            'swipe_support' => true,
            'pause_on_hover' => true,
            'lazy_load_images' => true,
        ];
    }

    private function clearCaches(): void
    {
        Cache::forget('hero.settings');
        Cache::forget('hero.runtime.v1');
        Cache::forget('navigation.public.runtime');
    }

    private function assetUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, 'blob:')) {
            return $path;
        }

        if (str_starts_with($path, '/storage/') || str_starts_with($path, 'storage/')) {
            return url($path);
        }

        return Storage::disk('public')->url($path);
    }
}
