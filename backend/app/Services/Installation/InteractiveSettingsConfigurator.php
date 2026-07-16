<?php

namespace App\Services\Installation;

use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use JsonException;
use RuntimeException;

class InteractiveSettingsConfigurator
{
    public function __construct(private readonly SettingsSchemaInspector $inspector) {}

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $modelDefaults
     * @return array<string, mixed>
     */
    public function collect(
        Command $command,
        string $modelClass,
        array $modelDefaults = [],
        bool $useDefaults = false,
    ): array {
        $model = new $modelClass;
        $existing = $modelClass::query()->first();
        $values = [];

        foreach ($this->inspector->fields($model) as $field) {
            $default = $existing
                ? $existing->getAttribute($field['name'])
                : ($modelDefaults[$field['name']] ?? $this->normalize($field, $field['default']));

            if ($useDefaults) {
                $value = $default;
                $this->validate($model, $field, $value);
            } else {
                $value = $this->promptUntilValid($command, $model, $field, $default);
            }

            $values[$field['name']] = $value;
        }

        return $values;
    }

    /**
     * @param  class-string<Model>  $modelClass
     * @param  array<string, mixed>  $values
     */
    public function save(string $modelClass, array $values): Model
    {
        $settings = $modelClass::query()->first() ?? new $modelClass;
        $settings->forceFill($values);
        $settings->save();

        return $settings;
    }

    /**
     * @param  array<string, mixed>  $field
     */
    private function promptUntilValid(Command $command, Model $model, array $field, mixed $default): mixed
    {
        while (true) {
            try {
                $value = $this->prompt($command, $model, $field, $default);
                $this->validate($model, $field, $value);

                return $value;
            } catch (ValidationException $exception) {
                $command->error(collect($exception->errors())->flatten()->first());
            } catch (JsonException) {
                $command->error("{$field['label']} must contain valid JSON.");
            }
        }
    }

    /**
     * @param  array<string, mixed>  $field
     */
    private function prompt(Command $command, Model $model, array $field, mixed $default): mixed
    {
        $label = $field['label'];

        if ($field['input_type'] === 'boolean') {
            return $command->confirm($label, (bool) $default);
        }

        if ($field['input_type'] === 'enum') {
            return $command->choice($label, $field['enum_options'], $default);
        }

        if (is_array($field['foreign_key'])) {
            return $this->promptForeignKey($command, $model, $field, $default);
        }

        $question = $field['nullable']
            ? "{$label} (optional; type [null] to clear)"
            : $label;
        $displayDefault = $field['input_type'] === 'json' && $default !== null
            ? json_encode($default, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            : $default;
        $answer = $command->ask($question, $displayDefault);

        if ($answer === '[null]' || ($answer === null && $field['nullable'] && $default === null)) {
            return null;
        }

        return $this->normalize($field, $answer);
    }

    /**
     * @param  array<string, mixed>  $field
     */
    private function promptForeignKey(
        Command $command,
        Model $model,
        array $field,
        mixed $default,
    ): mixed {
        $options = $this->inspector->foreignKeyOptions($model, $field);

        if ($options === []) {
            if ($field['nullable']) {
                $command->warn("No records are available for {$field['label']}; leaving it empty.");

                return null;
            }

            throw new RuntimeException("No selectable records exist for required field {$field['label']}.");
        }

        $choices = collect($options)
            ->map(fn (array $option): string => "{$option['value']}: {$option['label']}")
            ->values()
            ->all();

        if ($field['nullable']) {
            array_unshift($choices, '[none]');
        }

        $defaultIndex = collect($choices)->search(
            fn (string $choice): bool => str_starts_with($choice, (string) $default.': ')
        );
        $selected = $command->choice(
            $field['label'],
            $choices,
            $defaultIndex === false ? 0 : $defaultIndex,
        );

        if ($selected === '[none]') {
            return null;
        }

        return $this->normalize($field, str($selected)->before(':')->toString());
    }

    /**
     * @param  array<string, mixed>  $field
     */
    private function normalize(array $field, mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($field['input_type']) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'integer' => filter_var($value, FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE),
            'number' => is_numeric($value) ? (float) $value : $value,
            'json' => is_string($value) ? json_decode($value, true, 512, JSON_THROW_ON_ERROR) : $value,
            default => $value,
        };
    }

    /**
     * @param  array<string, mixed>  $field
     */
    private function validate(Model $model, array $field, mixed $value): void
    {
        $rules = [$field['nullable'] ? 'nullable' : 'required'];

        $rules[] = match ($field['input_type']) {
            'boolean' => 'boolean',
            'integer' => 'integer',
            'number' => 'numeric',
            'json' => 'array',
            'date' => 'date',
            default => 'string',
        };

        if ($field['max_length']) {
            $rules[] = 'max:'.$field['max_length'];
        }

        if ($field['unsigned'] && in_array($field['input_type'], ['integer', 'number'], true)) {
            $rules[] = 'min:0';
        }

        if ($field['enum_options'] !== []) {
            $rules[] = Rule::in($field['enum_options']);
        }

        if (is_array($field['foreign_key'])) {
            $rules[] = Rule::exists(
                $field['foreign_key']['foreign_table'],
                $field['foreign_key']['foreign_columns'][0],
            );
        }

        if (str_contains($field['name'], 'email')) {
            $rules[] = 'email';
        } elseif (str_ends_with($field['name'], '_url')) {
            $rules[] = 'url';
        } elseif (str_contains($field['name'], 'timezone')) {
            $rules[] = 'timezone';
        } elseif (preg_match('/(?:^|_)(?:phone|mobile|phone_number|mobile_number)$/', $field['name'])) {
            $rules[] = 'regex:/^\+?[0-9\s().-]{6,40}$/';
        }

        Validator::make(
            ['value' => $value],
            ['value' => $rules],
            [],
            ['value' => $field['label']],
        )->validate();
    }
}
