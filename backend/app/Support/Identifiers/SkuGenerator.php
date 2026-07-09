<?php

namespace App\Support\Identifiers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SkuGenerator
{
    public static function generate(
        string $source,
        string|array $modelsOrTables,
        mixed $ignoreId = null,
        string $column = 'sku',
        int $maxLength = 100
    ): string {
        $base = Str::slug(trim($source), '-');

        if ($base === '') {
            throw new InvalidArgumentException('A source value is required to generate an SKU.');
        }

        $base = self::trimValue(strtoupper($base), $maxLength);
        $sku = $base;

        while (self::exists((array) $modelsOrTables, $column, $sku, $ignoreId)) {
            $suffix = (string) random_int(1000, 9999);
            $sku = self::trimValue($base, $maxLength - strlen($suffix) - 1).'-'.$suffix;
        }

        return $sku;
    }

    private static function exists(array $modelsOrTables, string $column, string $value, mixed $ignoreId): bool
    {
        foreach ($modelsOrTables as $modelOrTable) {
            $query = DB::table(self::table($modelOrTable))->where($column, $value);

            if ($ignoreId && count($modelsOrTables) === 1) {
                $query->where('id', '!=', $ignoreId);
            }

            if ($query->exists()) {
                return true;
            }
        }

        return false;
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
