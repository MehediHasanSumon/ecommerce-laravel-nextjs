<?php

use App\Console\Commands\InstallApplication;
use App\Console\Commands\MaintainIpBlocking;
use App\Console\Commands\RebuildProductSearchIndex;
use App\Console\Commands\SyncCollectionSchedules;
use App\Console\Commands\SyncCourierShipments;
use App\Exceptions\CourierApiException;
use App\Exceptions\FraudProviderException;
use App\Http\Middleware\AuthenticateAuthCookie;
use App\Http\Middleware\EnforceIpBlock;
use App\Http\Middleware\EnsureAdministrator;
use App\Http\Middleware\MonitorSuspiciousActivity;
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
        InstallApplication::class,
        SyncCollectionSchedules::class,
        MaintainIpBlocking::class,
        RebuildProductSearchIndex::class,
        SyncCourierShipments::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: env('TRUSTED_PROXIES', '*'));
        $middleware->prepend(HandleCors::class);

        $middleware->encryptCookies(except: [
            'auth_access_token',
            'auth_refresh_token',
            ...(env('AUTH_ACCESS_COOKIE_NAME') ? [env('AUTH_ACCESS_COOKIE_NAME')] : []),
        ]);

        $middleware->api(prepend: [
            SecurityHeaders::class,
            EnforceIpBlock::class,
            MonitorSuspiciousActivity::class,
        ]);

        $middleware->web(prepend: [
            EnforceIpBlock::class,
            MonitorSuspiciousActivity::class,
        ]);

        $middleware->alias([
            'auth.cookie' => AuthenticateAuthCookie::class,
            'auth.cookie.optional' => ResolveAuthCookie::class,
            'administrator' => EnsureAdministrator::class,
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

        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException|\Symfony\Component\HttpKernel\Exception\NotFoundHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('The requested resource was not found.', 404);
        });

        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('Unauthenticated. Please log in to continue.', 401);
        });

        $exceptions->render(function (\Illuminate\Auth\Access\AuthorizationException|\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('You do not have permission to perform this action.', 403);
        });

        $exceptions->render(function (\Illuminate\Http\Exceptions\ThrottleRequestsException|\Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return ApiResponse::error('Too many requests. Please wait a moment and try again.', 429);
        });

        $exceptions->render(function (CourierApiException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = $e->statusCode && $e->statusCode >= 400 && $e->statusCode <= 599
                ? $e->statusCode
                : 502;

            return ApiResponse::error($e->getMessage(), $status);
        });

        $exceptions->render(function (FraudProviderException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = $e->statusCode && $e->statusCode >= 400 && $e->statusCode <= 599
                ? $e->statusCode
                : 502;

            return ApiResponse::error($e->getMessage(), $status);
        });
    })->create();
