<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\SmsSetting;
use App\Models\SmsTemplate;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Services\Sms\SmsProviderManager;
use App\Support\SmsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SmsSettingsService
{
    use ManagesSingletonSettings {
        get as private getSingleton;
        update as private updateSingleton;
    }

    public function __construct(private readonly SmsProviderManager $providers) {}

    protected function modelClass(): string
    {
        return SmsSetting::class;
    }

    protected function defaults(): array
    {
        return SmsDefaults::settings();
    }

    protected function cacheKey(): string
    {
        return 'settings.sms';
    }

    public function get(): Model
    {
        $setting = $this->getSingleton();
        if ($setting->default_country_code === '88') {
            $setting->update(['default_country_code' => '880']);
            $setting->refresh();
        }
        $defaults = $this->defaults();
        $providerConfiguration = [
            ...$defaults['provider_configuration'],
            ...(array) $setting->provider_configuration,
        ];
        $orderEvents = [...$defaults['order_status_events'], ...(array) $setting->order_status_events];
        $shippingEvents = [...$defaults['shipping_status_events'], ...(array) $setting->shipping_status_events];
        if ($providerConfiguration !== $setting->provider_configuration
            || $orderEvents !== $setting->order_status_events
            || $shippingEvents !== $setting->shipping_status_events) {
            $setting->update([
                'provider_configuration' => $providerConfiguration,
                'order_status_events' => $orderEvents,
                'shipping_status_events' => $shippingEvents,
            ]);
            $setting->refresh();
        }
        $this->seedTemplates();

        return $setting;
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $templates = $data['templates'] ?? null;
        unset($data['templates']);

        foreach (['api_key', 'api_secret', 'username', 'password'] as $secret) {
            if (! array_key_exists($secret, $data) || $data[$secret] === null || $data[$secret] === '') {
                unset($data[$secret]);
            }
        }

        return DB::transaction(function () use ($data, $templates, $userId): Model {
            $setting = $this->updateSingleton($data, $userId);
            if (is_array($templates)) {
                foreach ($templates as $template) {
                    SmsTemplate::query()
                        ->where('event', $template['event'])
                        ->update([
                            'body' => $template['body'],
                            'enabled' => $template['enabled'],
                            'updated_by' => $userId,
                        ]);
                }
            }
            Cache::forget('settings.sms.runtime');

            return $setting;
        });
    }

    public function runtime(): array
    {
        return Cache::remember('settings.sms.runtime', now()->addMinutes(10), function (): array {
            $settings = $this->get();

            return [
                'enabled' => (bool) $settings->enabled,
                'require_guest_checkout_otp' => (bool) $settings->enabled && (bool) $settings->require_guest_checkout_otp,
                'require_registered_checkout_otp' => (bool) $settings->enabled && (bool) $settings->require_registered_checkout_otp,
                'otp_length' => (int) $settings->otp_length,
                'otp_expiration_minutes' => (int) $settings->otp_expiration_minutes,
                'otp_resend_cooldown_seconds' => (int) $settings->otp_resend_cooldown_seconds,
            ];
        });
    }

    public function templates()
    {
        $this->seedTemplates();

        return SmsTemplate::query()->orderBy('id')->get();
    }

    public function payload(): array
    {
        $settings = $this->get();

        return [
            'settings' => [
                ...$settings->only([
                    'enabled', 'provider', 'api_base_url', 'sender_id', 'route',
                    'provider_configuration',
                    'default_country_code', 'request_timeout', 'test_number',
                    'require_guest_checkout_otp', 'require_registered_checkout_otp',
                    'otp_length', 'otp_expiration_minutes', 'otp_resend_cooldown_seconds',
                    'otp_max_resends', 'otp_max_verification_attempts', 'otp_rate_limit_per_hour',
                    'order_confirmation_enabled', 'order_status_events', 'shipping_status_events',
                ]),
                'api_key_configured' => filled($settings->api_key),
                'api_secret_configured' => filled($settings->api_secret),
                'username_configured' => filled($settings->username),
                'password_configured' => filled($settings->password),
            ],
            'templates' => $this->templates()->map(fn (SmsTemplate $template): array => [
                'event' => $template->event,
                'name' => $template->name,
                'body' => $template->body,
                'enabled' => (bool) $template->enabled,
                'allowed_placeholders' => $template->allowed_placeholders,
            ])->all(),
            'providers' => $this->providers->providers(),
            'placeholders' => SmsDefaults::PLACEHOLDERS,
        ];
    }

    private function seedTemplates(): void
    {
        foreach (SmsDefaults::templates() as $template) {
            SmsTemplate::query()->firstOrCreate(['event' => $template['event']], $template);
        }
    }
}
