<?php

namespace App\Services\Marketing;

use App\Contracts\Marketing\MarketingTrackingProvider;
use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

class MarketingProviderManager
{
    public function __construct(private readonly Container $container) {}

    public function provider(string $platform): MarketingTrackingProvider
    {
        $providerClass = config("marketing.providers.{$platform}");
        if (! is_string($providerClass) || $providerClass === '') {
            throw new InvalidArgumentException("Unsupported marketing platform [{$platform}].");
        }

        $provider = $this->container->make($providerClass);
        if (! $provider instanceof MarketingTrackingProvider) {
            throw new InvalidArgumentException("Marketing provider [{$platform}] must implement the tracking provider contract.");
        }

        return $provider;
    }

    public function platforms(): array
    {
        return array_keys((array) config('marketing.providers', []));
    }
}
