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
            if (is_string($path)) {
                $storageIndex = strpos($path, '/storage/');
                if ($storageIndex !== false) {
                    $value = substr($path, $storageIndex + strlen('/storage/'));
                } else {
                    return filter_var($value, FILTER_VALIDATE_URL) ? $value : null;
                }
            } else {
                return filter_var($value, FILTER_VALIDATE_URL) ? $value : null;
            }
        }

        $value = preg_replace('#^/+storage/+|^storage/+#', '', $value) ?? '';
        $value = ltrim($value, '/');

        if ($value === '' || str_contains($value, '..')) {
            return null;
        }

        return $value;
    }

    public static function url(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $lower = strtolower(trim($value));
        if (str_starts_with($lower, 'http://') || str_starts_with($lower, 'https://')) {
            return $value;
        }

        $path = self::path($value);

        return $path ? Storage::disk('public')->url($path) : null;
    }

    public static function object(mixed $image): array
    {
        if ($image instanceof ProductImage) {
            $id = $image->id;
            $rawUrl = $image->url;
            $altText = $image->alt_text;
            $type = $image->type;
            $sortOrder = $image->sort_order;
            $isPrimary = (bool) $image->is_primary;
        } elseif (is_array($image)) {
            $id = $image['id'] ?? null;
            $rawUrl = $image['url'] ?? $image['path'] ?? null;
            $altText = $image['alt_text'] ?? null;
            $type = $image['type'] ?? 'gallery';
            $sortOrder = $image['sort_order'] ?? 0;
            $isPrimary = (bool) ($image['is_primary'] ?? false);
        } elseif (is_object($image)) {
            $id = $image->id ?? null;
            $rawUrl = $image->url ?? $image->path ?? null;
            $altText = $image->alt_text ?? null;
            $type = $image->type ?? 'gallery';
            $sortOrder = $image->sort_order ?? 0;
            $isPrimary = (bool) ($image->is_primary ?? false);
        } else {
            $rawUrl = is_string($image) ? $image : null;
            $id = null;
            $altText = null;
            $type = 'gallery';
            $sortOrder = 0;
            $isPrimary = false;
        }

        $path = self::path($rawUrl);

        return [
            'id' => $id,
            'path' => $path,
            'url' => self::url($path ?: $rawUrl),
            'alt_text' => $altText,
            'type' => $type,
            'sort_order' => $sortOrder,
            'is_primary' => $isPrimary,
        ];
    }
}
