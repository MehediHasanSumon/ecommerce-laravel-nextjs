<?php

namespace App\Http\Middleware;

use App\Http\Responses\AuthCookie;
use App\Services\AuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateAuthCookie
{
    public function __construct(private readonly AuthService $authService) {}

    public function handle(Request $request, Closure $next, string $ability = 'access'): Response
    {
        $plainTextToken = $request->cookie(config('auth_api.access_cookie_name')) ?: $request->bearerToken();

        $user = $this->authService->userFromToken($plainTextToken);

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $request->setUserResolver(fn () => $user);

        $response = $next($request);

        return $plainTextToken
            ? $response->withCookie(AuthCookie::access($plainTextToken))
            : $response;
    }
}
