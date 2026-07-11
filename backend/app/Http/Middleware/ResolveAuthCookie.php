<?php

namespace App\Http\Middleware;

use App\Http\Responses\AuthCookie;
use App\Services\AuthService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ResolveAuthCookie
{
    public function __construct(private readonly AuthService $authService) {}

    public function handle(Request $request, Closure $next, string $ability = 'access'): Response
    {
        $plainTextToken = $request->cookie(config('auth_api.access_cookie_name')) ?: $request->bearerToken();

        $user = $this->authService->userFromToken($plainTextToken);

        if ($user) {
            $request->setUserResolver(fn () => $user);
            Auth::setUser($user);
        }

        $response = $next($request);

        return $user && $plainTextToken
            ? $response->withCookie(AuthCookie::access($plainTextToken))
            : $response;
    }
}
