<?php

if (
    trait_exists(\Spatie\Activitylog\Traits\LogsActivity::class)
    && ! trait_exists(\Spatie\Activitylog\Models\Concerns\LogsActivity::class)
) {
    class_alias(
        \Spatie\Activitylog\Traits\LogsActivity::class,
        \Spatie\Activitylog\Models\Concerns\LogsActivity::class
    );
}
