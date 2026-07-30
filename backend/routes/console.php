<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('collections:sync-schedules')
    ->everyFiveMinutes()
    ->withoutOverlapping(10)
    ->onOneServer();

Schedule::command('security:maintain-ip-blocking')
    ->everyMinute()
    ->withoutOverlapping(5)
    ->onOneServer();

Schedule::command('search:reindex-products --stale --limit=1000')
    ->everyTenMinutes()
    ->withoutOverlapping(30)
    ->onOneServer();

Schedule::command('couriers:sync-shipments --limit=100')
    ->everyTenMinutes()
    ->withoutOverlapping(20)
    ->onOneServer();
