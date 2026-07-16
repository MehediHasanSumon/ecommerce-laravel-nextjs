<?php

namespace App\Http\Controllers\Api\Admin\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Settings\UpdateSmsSettingsRequest;
use App\Http\Responses\ApiResponse;
use App\Models\SmsLog;
use App\Services\Admin\Settings\SmsSettingsService;
use App\Services\Sms\PhoneNumberNormalizer;
use App\Services\Sms\SmsDeliveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Str;

class SmsSettingsController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly SmsSettingsService $settings,
        private readonly SmsDeliveryService $delivery,
        private readonly PhoneNumberNormalizer $phones,
    ) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_sms_setting', only: ['show']),
            new Middleware('permission:can_edit_sms_setting', only: ['update', 'test']),
        ];
    }

    public function show(): JsonResponse
    {
        return ApiResponse::success($this->settings->payload());
    }

    public function update(UpdateSmsSettingsRequest $request): JsonResponse
    {
        $this->settings->update($request->validated(), $request->user()?->id);

        return ApiResponse::success($this->settings->payload(), 'SMS settings saved successfully.');
    }

    public function test(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mobile' => ['required', 'string', 'max:40', 'regex:/^(?:\+?88)?01[3-9]\d{8}$/'],
        ]);
        $settings = $this->settings->get();
        abort_unless($settings->enabled, 422, 'Enable the SMS service before testing the provider.');

        $log = SmsLog::query()->create([
            'public_id' => (string) Str::uuid(),
            'recipient' => $this->phones->normalize($data['mobile'], $settings),
            'type' => 'test',
            'provider' => $settings->provider,
            'message' => 'SMS provider test from '.config('app.name').'.',
            'status' => 'queued',
        ]);
        $this->delivery->deliver($log);

        return ApiResponse::success(['log' => $log->fresh()], 'Test SMS sent successfully.');
    }
}
