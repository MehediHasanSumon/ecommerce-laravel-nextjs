<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\CourierProviderSetting;
use App\Services\Admin\AdminNavigationService;
use App\Services\Courier\CourierManager;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CourierSettingsService
{
    public const PROVIDERS = ['steadfast', 'pathao'];

    public function __construct(private readonly CourierManager $manager) {}

    public function all(): Collection
    {
        $this->syncProviders();

        return CourierProviderSetting::query()
            ->whereIn('provider', self::PROVIDERS)
            ->orderBy('display_order')
            ->get();
    }

    public function enabled(?string $provider = null): Collection
    {
        $this->syncProviders();
        $enabledProviders = Cache::remember(
            'courier.enabled.providers',
            now()->addMinutes(10),
            fn (): array => CourierProviderSetting::query()
                ->whereIn('provider', self::PROVIDERS)
                ->where('enabled', true)
                ->orderBy('display_order')
                ->pluck('provider')
                ->all(),
        );

        return CourierProviderSetting::query()
            ->whereIn('provider', $enabledProviders)
            ->orderBy('display_order')
            ->get()
            ->when($provider, fn (Collection $settings) => $settings->where('provider', $provider))
            ->values();
    }

    public function findEnabled(string $provider): CourierProviderSetting
    {
        $setting = $this->enabled($provider)->first();
        abort_unless($setting, 422, 'The selected courier provider is not enabled.');

        return $setting;
    }

    public function replace(array $providers, ?int $userId = null): Collection
    {
        $this->syncProviders();

        DB::transaction(function () use ($providers, $userId): void {
            foreach (array_values($providers) as $index => $payload) {
                if (! in_array($payload['provider'], self::PROVIDERS, true)) {
                    continue;
                }

                $setting = CourierProviderSetting::query()->where('provider', $payload['provider'])->lockForUpdate()->firstOrFail();
                foreach (['api_key', 'api_secret', 'webhook_secret'] as $secret) {
                    if (($payload[$secret] ?? null) === '********' || ! array_key_exists($secret, $payload)) {
                        unset($payload[$secret]);
                    }
                }

                $credentialChanged = collect(['api_key', 'api_secret', 'api_base_url', 'sandbox_mode'])
                    ->contains(fn (string $key): bool => array_key_exists($key, $payload) && $payload[$key] !== $setting->{$key});

                $setting->fill([
                    ...$payload,
                    'display_order' => $payload['display_order'] ?? $index,
                    'updated_by' => $userId,
                    ...($credentialChanged ? [
                        'access_token' => null,
                        'refresh_token' => null,
                        'token_expires_at' => null,
                    ] : []),
                ])->save();
            }
        }, 3);

        Cache::forget('courier.enabled.providers');
        app(AdminNavigationService::class)->invalidate();

        return $this->all();
    }

    public function test(string $provider): array
    {
        $setting = CourierProviderSetting::query()->where('provider', $provider)->firstOrFail();
        abort_unless($setting->api_key && $setting->api_secret, 422, 'Save the courier credentials before testing the connection.');

        return $this->manager->provider($provider)->testConnection($setting);
    }

    public function metadata(): array
    {
        return $this->manager->providers();
    }

    private function syncProviders(): void
    {
        foreach (self::PROVIDERS as $index => $provider) {
            CourierProviderSetting::query()->firstOrCreate(
                ['provider' => $provider],
                [
                    'enabled' => false,
                    'sandbox_mode' => true,
                    'default_parcel_type' => $provider === 'pathao' ? '2' : 'parcel',
                    'default_item_description' => 'Ecommerce order',
                    'default_delivery_type' => $provider === 'pathao' ? '48' : 'standard',
                    'default_payment_type' => 'cash_on_delivery',
                    'default_weight' => 0.50,
                    'cod_amount_rule' => 'outstanding',
                    'additional_configuration' => [],
                    'display_order' => $index,
                ],
            );
        }
    }
}
