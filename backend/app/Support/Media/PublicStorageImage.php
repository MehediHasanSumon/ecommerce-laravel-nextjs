<?php

namespace App\Support\Media;

use App\Models\ProductImage;
use Illuminate\Support\Facades\Storage;

class PublicStorageImage
{
    public static function path(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim(str_replace('\\', '/', $value));
        if ($value === '' || preg_match('/[\x00-\x1F\x7F]/', $value)) {
            return null;
        }

        $lower = strtolower($value);
        if (str_starts_with($lower, 'blob:') || str_starts_with($lower, 'data:')) {
            return null;
        }

        if (str_starts_with($lower, 'http://') || str_starts_with($lower, 'https://')) {
            $path = parse_url($value, PHP_URL_PATH);
            if (! is_string($path)) {
                return null;
            }

            $storageIndex = strpos($path, '/storage/');
            if ($storageIndex === false) {
                return null;
            }

            $value = substr($path, $storageIndex + strlen('/storage/'));
        }

        $value = preg_replace('#^/+storage/+|^storage/+#', '', $value) ?? '';
        $value = ltrim($value, '/');

        if ($value === '' || str_contains($value, '..') || str_contains($value, ':')) {
            return null;
        }

        if (! preg_match('#^[A-Za-z0-9][A-Za-z0-9._/\-]*$#', $value)) {
            return null;
        }

        return $value;
    }

    public static function url(?string $value): ?string
    {
        $path = self::path($value);

        return $path ? Storage::disk('public')->url($path) : null;
    }

    public static function object(ProductImage $image): array
    {
        $path = self::path($image->url);

        return [
            'id' => $image->id,
            'path' => $path,
            'url' => self::url($path),
            'alt_text' => $image->alt_text,
            'type' => $image->type,
            'sort_order' => $image->sort_order,
            'is_primary' => (bool) $image->is_primary,
        ];
    }
}
