<?php

namespace App\Services\Search;

use Illuminate\Support\Str;

class SearchNormalizer
{
    public function normalize(?string $value): string
    {
        $value = Str::ascii((string) $value);
        $value = mb_strtolower($value);
        $value = preg_replace('/[^\pL\pN]+/u', ' ', $value) ?? '';

        return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    }

    /**
     * @return list<string>
     */
    public function tokens(?string $value, int $limit = 40): array
    {
        $normalized = $this->normalize($value);
        if ($normalized === '') {
            return [];
        }

        return collect(explode(' ', $normalized))
            ->filter(fn (string $token): bool => mb_strlen($token) >= 2)
            ->flatMap(fn (string $token): array => $this->wordForms($token))
            ->unique()
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * @return list<string>
     */
    public function wordForms(string $token): array
    {
        $forms = [$token];
        $length = mb_strlen($token);

        if ($length > 4 && str_ends_with($token, 'ies')) {
            $forms[] = mb_substr($token, 0, -3).'y';
        } elseif ($length > 4 && str_ends_with($token, 'es')) {
            $forms[] = mb_substr($token, 0, -2);
        } elseif ($length > 3 && str_ends_with($token, 's')) {
            $forms[] = mb_substr($token, 0, -1);
        }

        return array_values(array_unique(array_filter($forms)));
    }
}
