<?php

namespace App\Services\Security;

use App\Models\IpBlock;
use App\Support\Security\IpAddress;
use Illuminate\Support\Facades\Cache;

class IpBlockStateService
{
    public function __construct(private readonly SecuritySettingsService $settings) {}

    public function isBlocked(string $ip): bool
    {
        $ip = IpAddress::normalize($ip);
        if ($ip === null || IpAddress::isLocal($ip)) {
            return false;
        }

        return (bool) Cache::remember(
            $this->key($ip),
            max(15, (int) config('ip_blocking.negative_cache_seconds', 60)),
            fn () => $this->resolve($ip),
        );
    }

    public function isWhitelisted(string $ip): bool
    {
        $ip = IpAddress::normalize($ip);
        if ($ip === null || IpAddress::isLocal($ip)) {
            return true;
        }

        return IpAddress::inAnyNetwork($ip, $this->settings->rules()['whitelist'] ?? []);
    }

    public function isBlacklisted(string $ip): bool
    {
        $ip = IpAddress::normalize($ip);

        return $ip !== null && IpAddress::inAnyNetwork($ip, $this->settings->rules()['blacklist'] ?? []);
    }

    public function forget(string $ip): void
    {
        $normalized = IpAddress::normalize($ip);
        if ($normalized !== null) {
            Cache::forget($this->key($normalized));
        }
    }

    private function resolve(string $ip): bool
    {
        if ($this->isBlacklisted($ip)) {
            return true;
        }

        return IpBlock::query()
            ->where('ip_address', $ip)
            ->where('status', 'active')
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->when($this->isWhitelisted($ip), fn ($query) => $query->where('type', 'manual'))
            ->exists();
    }

    private function key(string $ip): string
    {
        return 'security.ip-blocking.state.'.IpAddress::cacheKey($ip);
    }
}
