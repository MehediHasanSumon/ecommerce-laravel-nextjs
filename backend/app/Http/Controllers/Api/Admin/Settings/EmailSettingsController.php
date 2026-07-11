<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateEmailSettingsRequest;
use App\Http\Resources\Admin\Settings\EmailSettingResource;
use App\Http\Responses\ApiResponse;
use App\Services\Admin\Settings\EmailSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class EmailSettingsController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_email_setting', only: ['show']),
            new Middleware('permission:can_edit_email_setting', only: ['update', 'test']),
        ];
    }

    public function __construct(private readonly EmailSettingsService $settings) {}

    public function show(): JsonResponse
    {
        return ApiResponse::success(['settings' => EmailSettingResource::make($this->settings->get())->resolve()]);
    }

    public function update(UpdateEmailSettingsRequest $request): JsonResponse
    {
        $data = $request->validated();
        if (($data['password'] ?? '') === '********') {
            unset($data['password']);
        }

        return ApiResponse::success(['settings' => EmailSettingResource::make($this->settings->update($data, $request->user()?->id))->resolve()], 'Email settings saved.');
    }

    public function test(): JsonResponse
    {
        $this->settings->markTested();

        return ApiResponse::success(['status' => 'queued'], 'Test email queued successfully.');
    }
}
