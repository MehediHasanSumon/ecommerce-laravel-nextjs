<?php

namespace Database\Seeders;

use Faker\Factory;
use Faker\Generator;

if (! function_exists(__NAMESPACE__.'\\fake')) {
    function fake(?string $locale = null): Generator
    {
        static $faker = [];

        $locale ??= config('app.faker_locale', 'en_US');

        return $faker[$locale] ??= Factory::create($locale);
    }
}
