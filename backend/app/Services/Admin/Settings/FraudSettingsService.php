<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\FraudProviderSetting;
use App\Services\Admin\AdminNavigationService;
use App\Services\Fraud\FraudManager;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class FraudSettingsService
{
    public function __construct(private readonly FraudManager $manager) {}

    public function providerKeys(): array
    {
        return $this->manager->keys();
    }

    public function all(): Collection
    {
        $this->syncProviders();

        return FraudProviderSetting::query()
            ->whereIn('provider', $this->providerKeys())
            ->orderBy('display_order')
            ->get();
    }

    public function enabled(array $priority = []): Collection
    {
        $this->syncProviders();
        $enabled = Cache::remember(
            'fraud.enabled.providers',
            now()->addMinutes(10),
            fn (): array => FraudProviderSetting::query()
                ->whereIn('provider', $this->providerKeys())
                ->where('enabled', true)
                ->orderBy('display_order')
                ->pluck('provider')
                ->all(),
        );
        $order = collect($priority)->filter(fn ($provider) => in_array($provider, $enabled, true))
            ->merge($enabled)
            ->unique()
            ->values();

        return FraudProviderSetting::query()
            ->whereIn('provider', $order)
            ->get()
            ->sortBy(fn (FraudProviderSetting $setting) => $order->search($setting->provider))
            ->values();
    }

    public function replace(array $providers, ?int $userId = null): Collection
    {
        $this->syncProviders();

        DB::transaction(function () use ($providers, $userId): void {
            foreach (array_values($providers) as $index => $payload) {
                if (! in_array($payload['provider'], $this->providerKeys(), true)) {
                    continue;
                }

                $setting = FraudProviderSetting::query()->where('provider', $payload['provider'])->lockForUpdate()->firstOrFail();
                foreach (['api_key', 'api_secret'] as $secret) {
                    if (($payload[$secret] ?? null) === '********' || ! array_key_exists($secret, $payload)) {
                        unset($payload[$secret]);
                    }
                }
                $credentialChanged = collect(['api_key', 'api_secret', 'api_url', 'sandbox_mode'])
                    ->contains(fn (string $key): bool => array_key_exists($key, $payload) && $payload[$key] !== $setting->{$key});

                $setting->fill([
                    ...$payload,
                    'display_order' => $payload['display_order'] ?? $index,
                    'updated_by' => $userId,
                    ...($credentialChanged ? [
                        'connection_status' => 'not_tested',
                        'last_error' => null,
                        'consecutive_failures' => 0,
                        'circuit_open_until' => null,
                    ] : []),
                ])->save();
            }
        }, 3);

        Cache::forget('fraud.enabled.providers');
        app(AdminNavigationService::class)->invalidate();

        return $this->all();
    }

    public function test(string $provider): array
    {
        $setting = FraudProviderSetting::query()->where('provider', $provider)->firstOrFail();

        return $this->manager->provider($provider)->testConnection($setting);
    }

    public function metadata(): array
    {
        return $this->manager->providers();
    }

    private function syncProviders(): void
    {
        foreach ($this->providerKeys() as $index => $provider) {
            FraudProviderSetting::query()->firstOrCreate(
                ['provider' => $provider],
                [
                    'enabled' => false,
                    'sandbox_mode' => true,
                    'api_url' => config("fraud.providers.{$provider}.sandbox_url"),
                    'additional_configuration' => config("fraud.providers.{$provider}.default_configuration", []),
                    'display_order' => $index,
                ],
            );
        }
    }
}
