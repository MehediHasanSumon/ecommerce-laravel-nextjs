<?php

namespace App\Services\Security;

use App\Support\Security\IpAddress;
use Illuminate\Http\Request;

class TrustedClientIpResolver
{
    public function __construct(private readonly SecuritySettingsService $settings) {}

    public function resolve(Request $request): ?string
    {
        $remote = IpAddress::normalize((string) $request->server('REMOTE_ADDR'));
        if ($remote === null) {
            return IpAddress::normalize($request->ip());
        }

        if (! IpAddress::inAnyNetwork($remote, $this->settings->trustedProxyNetworks())) {
            return $remote;
        }

        $cloudflare = IpAddress::normalize($request->headers->get(config('ip_blocking.forwarded_headers.cloudflare')));
        if ($cloudflare !== null) {
            return $cloudflare;
        }

        $forwarded = array_values(array_filter(array_map(
            fn (string $value) => IpAddress::normalize(trim($value)),
            explode(',', (string) $request->headers->get(config('ip_blocking.forwarded_headers.forwarded_for'))),
        )));

        if ($forwarded !== []) {
            $trusted = $this->settings->trustedProxyNetworks();
            $chain = [...$forwarded, $remote];
            for ($index = count($chain) - 1; $index >= 0; $index--) {
                if (! IpAddress::inAnyNetwork($chain[$index], $trusted)) {
                    return $chain[$index];
                }
            }

            return $forwarded[0];
        }

        return IpAddress::normalize($request->headers->get(config('ip_blocking.forwarded_headers.real_ip')))
            ?? $remote;
    }
}
