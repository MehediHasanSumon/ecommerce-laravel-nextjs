<?php

namespace App\Services\Security;

use App\Models\IpAccessRule;
use App\Models\IpBlockEvent;
use App\Models\SecurityTrustedProxy;
use App\Models\Settings\SecuritySetting;
use App\Models\User;
use App\Support\Security\IpAddress;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SecuritySettingsService
{
    private const CACHE_KEY = 'security.ip-blocking.settings';

    private const RULES_CACHE_KEY = 'security.ip-blocking.rules';

    private const PROXIES_CACHE_KEY = 'security.ip-blocking.trusted-proxies';

    public function get(): SecuritySetting
    {
        $id = Cache::remember(
            self::CACHE_KEY,
            max(30, (int) config('ip_blocking.settings_cache_seconds', 300)),
            fn () => SecuritySetting::query()->firstOrCreate(['scope' => 'global'], $this->defaults())->id,
        );

        return SecuritySetting::query()->find($id)
            ?? SecuritySetting::query()->firstOrCreate(['scope' => 'global'], $this->defaults());
    }

    public function payload(): array
    {
        $settings = $this->get();

        return [
            'settings' => $settings->only([
                'auto_blocking_enabled',
                'enable_checkout_security',
                'enable_cod_security',
                'enable_payment_security',
                'auto_block_critical_ips',
                'max_failed_login_attempts',
                'max_password_reset_attempts',
                'max_payment_failures',
                'failed_cod_threshold',
                'time_window_minutes',
                'temporary_block_duration_minutes',
                'permanent_block_threshold',
            ]),
            'whitelist_ips' => IpAccessRule::query()->where('rule_type', 'whitelist')->orderBy('ip_address')->pluck('ip_address')->all(),
            'blacklist_ips' => IpAccessRule::query()->where('rule_type', 'blacklist')->orderBy('ip_address')->pluck('ip_address')->all(),
            'trusted_proxies' => SecurityTrustedProxy::query()->orderBy('network')->get(['network', 'label'])->map(fn ($proxy) => [
                'network' => $proxy->network,
                'label' => $proxy->label,
            ])->all(),
        ];
    }

    public function update(array $data, ?User $actor = null): array
    {
        $settingsData = collect($data)->except(['whitelist_ips', 'blacklist_ips', 'trusted_proxies'])->all();

        DB::transaction(function () use ($settingsData, $data, $actor): void {
            $settings = SecuritySetting::query()->where('scope', 'global')->lockForUpdate()->first()
                ?? SecuritySetting::query()->create(['scope' => 'global', ...$this->defaults()]);
            $before = $settings->only(array_keys($settingsData));
            $settings->fill([...$settingsData, 'updated_by' => $actor?->id])->save();

            $this->syncRules('whitelist', $data['whitelist_ips'] ?? [], $actor);
            $this->syncRules('blacklist', $data['blacklist_ips'] ?? [], $actor);
            $this->syncProxies($data['trusted_proxies'] ?? [], $actor);

            IpBlockEvent::query()->create([
                'event_type' => 'setting_changed',
                'actor_user_id' => $actor?->id,
                'actor_name' => $actor?->name,
                'actor_email' => $actor?->email,
                'metadata' => ['before' => $before, 'after' => $settingsData],
                'occurred_at' => now(),
            ]);

            DB::afterCommit(fn () => $this->flush());
        });

        return $this->payload();
    }

    public function rules(): array
    {
        return Cache::remember(
            self::RULES_CACHE_KEY,
            max(30, (int) config('ip_blocking.rules_cache_seconds', 300)),
            fn () => IpAccessRule::query()
                ->get(['ip_address', 'rule_type'])
                ->groupBy('rule_type')
                ->map(fn ($rows) => $rows->pluck('ip_address')->values()->all())
                ->all(),
        );
    }

    public function trustedProxyNetworks(): array
    {
        return Cache::remember(
            self::PROXIES_CACHE_KEY,
            max(30, (int) config('ip_blocking.rules_cache_seconds', 300)),
            fn () => array_values(array_unique([
                ...config('ip_blocking.trusted_proxies', []),
                ...SecurityTrustedProxy::query()->pluck('network')->all(),
            ])),
        );
    }

    public function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(self::RULES_CACHE_KEY);
        Cache::forget(self::PROXIES_CACHE_KEY);
    }

    private function syncRules(string $type, array $values, ?User $actor): void
    {
        $normalized = collect($values)
            ->map(fn ($value) => IpAddress::normalizeNetwork(is_array($value) ? ($value['ip_address'] ?? null) : $value))
            ->filter()
            ->unique()
            ->values();

        IpAccessRule::query()->where('rule_type', $type)->whereNotIn('ip_address', $normalized)->delete();

        foreach ($normalized as $network) {
            IpAccessRule::query()->updateOrCreate(
                ['ip_address' => $network],
                [
                    'rule_type' => $type,
                    'reason' => ucfirst($type).' rule configured in security settings.',
                    'created_by' => $actor?->id,
                    'updated_by' => $actor?->id,
                ],
            );
        }
    }

    private function syncProxies(array $values, ?User $actor): void
    {
        $normalized = collect($values)->map(function ($value): ?array {
            $network = IpAddress::normalizeNetwork(is_array($value) ? ($value['network'] ?? null) : $value);

            return $network ? [
                'network' => $network,
                'label' => is_array($value) ? mb_substr(trim((string) ($value['label'] ?? '')), 0, 120) ?: null : null,
            ] : null;
        })->filter()->unique('network')->values();

        SecurityTrustedProxy::query()->whereNotIn('network', $normalized->pluck('network'))->delete();

        foreach ($normalized as $proxy) {
            SecurityTrustedProxy::query()->updateOrCreate(
                ['network' => $proxy['network']],
                ['label' => $proxy['label'], 'created_by' => $actor?->id],
            );
        }
    }

    private function defaults(): array
    {
        return [
            'auto_blocking_enabled' => true,
            'enable_checkout_security' => true,
            'enable_cod_security' => true,
            'enable_payment_security' => true,
            'auto_block_critical_ips' => false,
            'max_failed_login_attempts' => 5,
            'max_password_reset_attempts' => 5,
            'max_payment_failures' => 8,
            'failed_cod_threshold' => 3,
            'time_window_minutes' => 10,
            'temporary_block_duration_minutes' => 30,
            'permanent_block_threshold' => 3,
        ];
    }
}
