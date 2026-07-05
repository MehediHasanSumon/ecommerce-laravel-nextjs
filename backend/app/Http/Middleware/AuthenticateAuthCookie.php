<?php

namespace App\Http\Middleware;

use App\Services\AuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateAuthCookie
{
    public function __construct(private readonly AuthService $authService) {}

    public function handle(Request $request, Closure $next, string $ability = 'access'): Response
    {
        $cookieName = $ability === 'refresh'
            ? config('auth_api.refresh_cookie_name')
            : config('auth_api.access_cookie_name');

        $user = $this->authService->userFromToken(
            $request->cookie($cookieName) ?: $request->bearerToken(),
            $ability
        );

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
