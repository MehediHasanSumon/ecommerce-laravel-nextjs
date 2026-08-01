<?php

namespace App\Services\Fraud;

use App\Contracts\Fraud\FraudProvider;
use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

class FraudManager
{
    public function __construct(private readonly Container $container) {}

    public function provider(string $provider): FraudProvider
    {
        $driver = config("fraud.providers.{$provider}.driver");
        if (! is_string($driver) || $driver === '') {
            throw new InvalidArgumentException("Unsupported fraud provider [{$provider}].");
        }

        $instance = $this->container->make($driver);
        if (! $instance instanceof FraudProvider || $instance->key() !== $provider) {
            throw new InvalidArgumentException("Invalid fraud provider driver [{$driver}].");
        }

        return $instance;
    }

    public function keys(): array
    {
        return collect((array) config('fraud.providers', []))
            ->filter(fn ($configuration): bool => is_array($configuration) && filled($configuration['driver'] ?? null))
            ->keys()
            ->values()
            ->all();
    }

    public function providers(): array
    {
        return collect($this->keys())
            ->map(fn (string $key): FraudProvider => $this->provider($key))
            ->mapWithKeys(fn (FraudProvider $provider): array => [
                $provider->key() => [
                    'label' => $provider->label(),
                    'capabilities' => $provider->capabilities(),
                ],
            ])
            ->all();
    }
}
