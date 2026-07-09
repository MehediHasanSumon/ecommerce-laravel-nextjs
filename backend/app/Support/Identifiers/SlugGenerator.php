<?php

namespace App\Support\Identifiers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SlugGenerator
{
    public static function generate(
        string $source,
        string $modelOrTable,
        mixed $ignoreId = null,
        string $column = 'slug',
        int $maxLength = 255,
        array $scope = []
    ): string {
        $base = Str::slug(trim($source));

        if ($base === '') {
            throw new InvalidArgumentException('A source value is required to generate a slug.');
        }

        $base = self::trimValue($base, $maxLength);
        $slug = $base;

        while (self::exists($modelOrTable, $column, $slug, $ignoreId, $scope)) {
            $suffix = (string) random_int(1000, 9999);
            $slug = self::trimValue($base, $maxLength - strlen($suffix) - 1).'-'.$suffix;
        }

        return $slug;
    }

    private static function exists(string $modelOrTable, string $column, string $value, mixed $ignoreId, array $scope): bool
    {
        $query = DB::table(self::table($modelOrTable))->where($column, $value);

        if ($ignoreId) {
            $query->where('id', '!=', $ignoreId);
        }

        foreach ($scope as $scopeColumn => $scopeValue) {
            $query->where($scopeColumn, $scopeValue);
        }

        return $query->exists();
    }

    private static function table(string $modelOrTable): string
    {
        if (is_subclass_of($modelOrTable, Model::class)) {
            return (new $modelOrTable)->getTable();
        }

        return $modelOrTable;
    }

    private static function trimValue(string $value, int $maxLength): string
    {
        return trim(Str::limit($value, $maxLength, ''), '-');
    }
}
