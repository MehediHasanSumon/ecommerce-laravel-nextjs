<?php

namespace App\Services\Installation;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SettingsSchemaInspector
{
    private const SYSTEM_COLUMNS = [
        'id',
        'uuid',
        'created_at',
        'updated_at',
        'deleted_at',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    /**
     * @return list<array<string, mixed>>
     */
    public function fields(Model $model): array
    {
        $schema = $model->getConnection()->getSchemaBuilder();
        $table = $model->getTable();
        $casts = $model->getCasts();
        $foreignKeys = collect($schema->getForeignKeys($table))
            ->filter(fn (array $key): bool => count($key['columns']) === 1)
            ->keyBy(fn (array $key): string => $key['columns'][0]);

        return collect($schema->getColumns($table))
            ->filter(fn (array $column): bool => $this->isConfigurable($model, $column))
            ->map(function (array $column) use ($casts, $foreignKeys): array {
                $name = $column['name'];
                $cast = isset($casts[$name]) ? (string) $casts[$name] : null;

                return [
                    ...$column,
                    'label' => Str::headline($name),
                    'input_type' => $this->inputType($column, $cast),
                    'cast' => $cast,
                    'enum_options' => $this->enumOptions($column['type']),
                    'foreign_key' => $foreignKeys->get($name),
                    'max_length' => $this->maxLength($column['type']),
                    'unsigned' => str_contains(strtolower($column['type']), 'unsigned'),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $field
     * @return list<array{value: mixed, label: string}>
     */
    public function foreignKeyOptions(Model $model, array $field): array
    {
        $foreignKey = $field['foreign_key'] ?? null;

        if (! is_array($foreignKey)) {
            return [];
        }

        $table = $foreignKey['foreign_table'];
        $key = $foreignKey['foreign_columns'][0];
        $schema = $model->getConnection()->getSchemaBuilder();
        $columns = collect($schema->getColumns($table))->pluck('name')->all();
        $labelColumn = collect(['name', 'title', 'label', 'currency', 'code', 'email', 'slug'])
            ->first(fn (string $candidate): bool => in_array($candidate, $columns, true));
        $labelColumn ??= collect($columns)->first(fn (string $column): bool => $column !== $key);

        $query = $model->getConnection()->table($table);
        if (in_array('deleted_at', $columns, true)) {
            $query->whereNull('deleted_at');
        }

        return $query
            ->orderBy($labelColumn ?: $key)
            ->limit(250)
            ->get(array_values(array_unique(array_filter([$key, $labelColumn]))))
            ->map(fn (object $row): array => [
                'value' => $row->{$key},
                'label' => $labelColumn ? (string) $row->{$labelColumn} : (string) $row->{$key},
            ])
            ->all();
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function isConfigurable(Model $model, array $column): bool
    {
        $name = $column['name'];
        $fillable = $model->getFillable();
        $guarded = $model->getGuarded();
        $allowedByModel = $fillable !== []
            ? in_array($name, $fillable, true)
            : $guarded !== ['*'] && ! in_array($name, $guarded, true);

        return ! in_array($name, self::SYSTEM_COLUMNS, true)
            && ! ($column['auto_increment'] ?? false)
            && empty($column['generation'])
            && $allowedByModel;
    }

    /**
     * @param  array<string, mixed>  $column
     */
    private function inputType(array $column, ?string $cast): string
    {
        $cast = strtolower((string) $cast);
        $type = strtolower($column['type_name']);
        $fullType = strtolower($column['type']);

        if ($cast === 'boolean' || $cast === 'bool' || $fullType === 'tinyint(1)') {
            return 'boolean';
        }

        if (in_array($cast, ['array', 'json', 'object', 'collection'], true) || $type === 'json') {
            return 'json';
        }

        if ($this->enumOptions($column['type']) !== []) {
            return 'enum';
        }

        if (
            str_starts_with($cast, 'integer')
            || in_array($cast, ['int'], true)
            || in_array($type, ['tinyint', 'smallint', 'mediumint', 'int', 'integer', 'bigint'], true)
        ) {
            return 'integer';
        }

        if (
            str_starts_with($cast, 'decimal')
            || in_array($cast, ['float', 'double', 'real'], true)
            || in_array($type, ['decimal', 'numeric', 'float', 'double', 'real'], true)
        ) {
            return 'number';
        }

        if (str_contains($cast, 'date') || in_array($type, ['date', 'datetime', 'timestamp', 'time'], true)) {
            return 'date';
        }

        return 'text';
    }

    /**
     * @return list<string>
     */
    private function enumOptions(string $type): array
    {
        if (! preg_match('/^enum\((.*)\)$/i', $type, $matches)) {
            return [];
        }

        return str_getcsv($matches[1], ',', "'");
    }

    private function maxLength(string $type): ?int
    {
        return preg_match('/^(?:var)?char\((\d+)\)/i', $type, $matches)
            ? (int) $matches[1]
            : null;
    }
}
