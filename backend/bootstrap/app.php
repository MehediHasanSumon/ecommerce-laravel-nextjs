<?php

use App\Http\Middleware\AuthenticateAuthCookie;
use App\Http\Middleware\ResolveAuthCookie;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Responses\ApiResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        App\Console\Commands\ImportProductImages::class,
        App\Console\Commands\SyncCollectionSchedules::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: [
            env('AUTH_ACCESS_COOKIE_NAME', 'auth_access_token'),
            env('AUTH_REFRESH_COOKIE_NAME', 'auth_refresh_token'),
        ]);

        $middleware->api(prepend: [
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'auth.cookie' => AuthenticateAuthCookie::class,
            'auth.cookie.optional' => ResolveAuthCookie::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('The given data was invalid.', 422, $e->errors());
        });
    })->create();
