<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateCourierSettingsRequest;
use App\Http\Resources\Admin\Settings\CourierProviderSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\CourierSettingsService;
use App\Services\Courier\CourierManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CourierSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_courier_setting', only: ['show']),
            new Middleware('permission:can_view_courier_setting|can_create_courier_shipment', only: ['locations']),
            new Middleware('permission:can_edit_courier_setting', only: ['update', 'test']),
        ];
    }

    public function __construct(
        private readonly CourierSettingsService $settings,
        private readonly CourierManager $manager,
    ) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success([
            'providers' => CourierProviderSettingResource::collection($this->settings->all())->resolve(),
            'metadata' => $this->settings->metadata(),
        ]);
    }

    public function update(UpdateCourierSettingsRequest $request): JsonResponse
    {
        return ApiResponse::success([
            'providers' => CourierProviderSettingResource::collection(
                $this->settings->replace($request->validated('providers'), $request->user()?->id)
            )->resolve(),
            'metadata' => $this->settings->metadata(),
        ], 'Courier settings saved successfully.');
    }

    public function test(string $provider): JsonResponse
    {
        abort_unless(in_array($provider, CourierSettingsService::PROVIDERS, true), 404);

        return ApiResponse::success([
            'result' => $this->settings->test($provider),
        ], 'Courier connection verified successfully.');
    }

    public function locations(Request $request, string $provider, string $type): JsonResponse
    {
        abort_unless(in_array($provider, CourierSettingsService::PROVIDERS, true), 404);
        $validated = $request->validate([
            'city_id' => ['nullable', 'integer', 'min:1'],
            'zone_id' => ['nullable', 'integer', 'min:1'],
        ]);
        $setting = $this->settings->findEnabled($provider);
        $adapter = $this->manager->provider($provider);
        $items = match ($type) {
            'stores' => $adapter->stores($setting),
            'cities' => $adapter->cities($setting),
            'zones' => $adapter->zones($setting, (int) ($validated['city_id'] ?? 0)),
            'areas' => $adapter->areas($setting, (int) ($validated['zone_id'] ?? 0)),
            default => abort(404),
        };

        return ApiResponse::success(['items' => $items]);
    }
}
