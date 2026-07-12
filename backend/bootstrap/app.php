<?php

use App\Http\Middleware\AuthenticateAuthCookie;
use App\Http\Middleware\ResolveAuthCookie;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Responses\ApiResponse;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(__DIR__.'/../routes/channels.php', [
        'prefix' => 'api',
        'middleware' => ['api', 'auth.cookie:access', 'throttle:public-settings'],
    ])
    ->withCommands([
        App\Console\Commands\ImportProductImages::class,
        App\Console\Commands\SyncCollectionSchedules::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(HandleCors::class);

        $middleware->encryptCookies(except: [
            env('AUTH_ACCESS_COOKIE_NAME', 'auth_access_token'),
        ]);

        $middleware->api(prepend: [
            SecurityHeaders::class,
        ]);

        $middleware->alias([
            'auth.cookie' => AuthenticateAuthCookie::class,
            'auth.cookie.optional' => ResolveAuthCookie::class,
            'permission' => PermissionMiddleware::class,
            'role' => RoleMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
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

            return ApiResponse::error('Validation failed.', 422, $e->errors());
        });
    })->create();
