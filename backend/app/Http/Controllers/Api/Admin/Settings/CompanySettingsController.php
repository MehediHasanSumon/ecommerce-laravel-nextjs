<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateCompanySettingsRequest;
use App\Http\Requests\Admin\Settings\UploadSettingsImageRequest;
use App\Http\Resources\Admin\Settings\CompanySettingResource;
use App\Http\Responses\ApiResponse;
use App\Models\Currency;
use App\Services\Admin\Settings\CompanySettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CompanySettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_company_setting', only: ['show']),
            new Middleware('permission:can_edit_company_setting', only: ['update', 'upload']),
        ];
    }

    public function __construct(private readonly CompanySettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success([
            'settings' => CompanySettingResource::make($this->settings->get())->resolve(),
            'currencies' => Currency::query()
                ->orderBy('country')
                ->get(['id', 'country', 'currency', 'symbol', 'status'])
                ->map(fn (Currency $currency): array => [
                    'id' => $currency->id,
                    'name' => "{$currency->country} ({$currency->currency} {$currency->symbol})",
                    'country' => $currency->country,
                    'currency' => $currency->currency,
                    'symbol' => $currency->symbol,
                    'status' => $currency->status,
                ])
                ->all(),
        ]);
    }

    public function update(UpdateCompanySettingsRequest $request): JsonResponse
    {
        return ApiResponse::success(['settings' => CompanySettingResource::make($this->settings->update($request->validated(), $request->user()?->id))->resolve()], 'Company settings saved.');
    }

    public function upload(UploadSettingsImageRequest $request): JsonResponse
    {
        return ApiResponse::success(['url' => $this->settings->upload($request->file('file'))], 'Image uploaded.', 201);
    }
}
