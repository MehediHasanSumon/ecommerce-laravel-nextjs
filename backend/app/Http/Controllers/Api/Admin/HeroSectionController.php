<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReorderHeroSlidesRequest;
use App\Http\Requests\Admin\SaveHeroSlideRequest;
use App\Http\Requests\Admin\Settings\UploadSettingsImageRequest;
use App\Http\Requests\Admin\UpdateHeroSettingsRequest;
use App\Http\Resources\Admin\HeroSlideResource;
use App\Http\Resources\Admin\Settings\HeroSettingResource;
use App\Http\Responses\ApiResponse;
use App\Models\HeroSlide;
use App\Services\Admin\HeroSectionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class HeroSectionController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_hero_section', only: ['show']),
            new Middleware('permission:can_create_hero_section', only: ['storeSlide', 'duplicateSlide']),
            new Middleware('permission:can_edit_hero_section', only: ['updateSettings', 'updateSlide', 'reorderSlides', 'upload']),
            new Middleware('permission:can_delete_hero_section', only: ['destroySlide']),
        ];
    }

    public function __construct(private readonly HeroSectionService $hero) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success($this->hero->adminPayload(), 'Hero section retrieved successfully.');
    }

    public function updateSettings(UpdateHeroSettingsRequest $request): JsonResponse
    {
        $settings = $this->hero->updateSettings($request->validated(), $request->user()?->id);

        return ApiResponse::success(['settings' => HeroSettingResource::make($settings)->resolve()], 'Hero settings saved successfully.');
    }

    public function storeSlide(SaveHeroSlideRequest $request): JsonResponse
    {
        $slide = $this->hero->createSlide($request->validated(), $request->user()?->id);

        return ApiResponse::success(['item' => HeroSlideResource::make($slide)->resolve()], 'Hero slide created successfully.', 201);
    }

    public function updateSlide(SaveHeroSlideRequest $request, HeroSlide $slide): JsonResponse
    {
        $slide = $this->hero->updateSlide($slide, $request->validated(), $request->user()?->id);

        return ApiResponse::success(['item' => HeroSlideResource::make($slide)->resolve()], 'Hero slide saved successfully.');
    }

    public function duplicateSlide(HeroSlide $slide): JsonResponse
    {
        $copy = $this->hero->duplicateSlide($slide, request()->user()?->id);

        return ApiResponse::success(['item' => HeroSlideResource::make($copy)->resolve()], 'Hero slide duplicated successfully.', 201);
    }

    public function destroySlide(HeroSlide $slide): JsonResponse
    {
        $this->hero->deleteSlide($slide, request()->user()?->id);

        return ApiResponse::success([], 'Hero slide deleted successfully.');
    }

    public function reorderSlides(ReorderHeroSlidesRequest $request): JsonResponse
    {
        $slides = $this->hero->reorder($request->validated('slides'), $request->user()?->id);

        return ApiResponse::success(['slides' => HeroSlideResource::collection($slides)->resolve()], 'Hero slides reordered successfully.');
    }

    public function upload(UploadSettingsImageRequest $request): JsonResponse
    {
        return ApiResponse::success(['url' => $this->hero->upload($request->file('file'))], 'Hero image uploaded.', 201);
    }
}
