<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateHomePageSettingsRequest;
use App\Http\Resources\Admin\Settings\BrandSettingResource;
use App\Http\Resources\Admin\Settings\CategoryDisplaySettingResource;
use App\Http\Resources\Admin\Settings\HomePageSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\BrandSettingsService;
use App\Services\Admin\Settings\CategoryDisplaySettingsService;
use App\Services\Admin\Settings\HomePageSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HomePageSettingsController extends Controller
{
    public function __construct(
        private readonly HomePageSettingsService $settings,
        private readonly CategoryDisplaySettingsService $categorySettings,
        private readonly BrandSettingsService $brandSettings,
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success([
            'settings' => $this->payload(),
        ]);
    }

    public function update(UpdateHomePageSettingsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $userId = $request->user()?->id;

        DB::transaction(function () use ($data, $userId): void {
            $this->settings->update($data['home'], $userId);
            $this->categorySettings->update($data['categories'], $userId);
            $this->brandSettings->update($data['brand'], $userId);
        });

        return ApiResponse::success([
            'settings' => $this->payload(),
        ], 'Home page settings saved successfully.');
    }

    private function payload(): array
    {
        return [
            'home' => HomePageSettingResource::make($this->settings->get())->resolve(),
            'categories' => CategoryDisplaySettingResource::make($this->categorySettings->get())->resolve(),
            'brand' => BrandSettingResource::make($this->brandSettings->get())->resolve(),
        ];
    }
}
