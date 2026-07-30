<?php

namespace App\Services\Courier;

use App\Contracts\Courier\CourierProvider;
use InvalidArgumentException;

class CourierManager
{
    public function __construct(
        private readonly SteadfastCourierProvider $steadfast,
        private readonly PathaoCourierProvider $pathao,
    ) {}

    public function provider(string $provider): CourierProvider
    {
        return match ($provider) {
            'steadfast' => $this->steadfast,
            'pathao' => $this->pathao,
            default => throw new InvalidArgumentException("Unsupported courier provider [{$provider}]."),
        };
    }

    /**
     * @return array<string, array{label: string, capabilities: array<string, bool>}>
     */
    public function providers(): array
    {
        return collect([$this->steadfast, $this->pathao])
            ->mapWithKeys(fn (CourierProvider $provider): array => [
                $provider->key() => [
                    'label' => $provider->label(),
                    'capabilities' => $provider->capabilities(),
                ],
            ])
            ->all();
    }
}
