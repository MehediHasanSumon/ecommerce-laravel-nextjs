<?php

namespace Database\Seeders\Settings;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

abstract class SettingsModuleSeeder extends Seeder
{
    protected function firstOrCreateSingleton(string $modelClass, array $defaults): Model
    {
        $model = $modelClass::query()->first();

        if (! $model) {
            return $modelClass::query()->create($defaults);
        }

        return $this->fillMissing($model, $defaults);
    }

    protected function firstOrCreateKeyed(string $modelClass, array $lookup, array $defaults): Model
    {
        $model = $modelClass::query()->where($lookup)->first();

        if (! $model) {
            return $modelClass::query()->create([...$lookup, ...$defaults]);
        }

        return $this->fillMissing($model, $defaults);
    }

    private function fillMissing(Model $model, array $defaults): Model
    {
        $dirty = false;

        foreach ($defaults as $key => $value) {
            if ($model->getAttribute($key) !== null || $value === null) {
                continue;
            }

            $model->setAttribute($key, $value);
            $dirty = true;
        }

        if ($dirty) {
            $model->save();
        }

        return $model;
    }
}
