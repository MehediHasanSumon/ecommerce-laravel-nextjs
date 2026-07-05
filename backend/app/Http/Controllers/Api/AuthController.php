<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Responses\ApiResponse;
use App\Http\Responses\AuthCookie;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{

    public function __construct(private readonly AuthService $authService) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $this->authService->register($request->validated());

        return ApiResponse::success(
            ['user' => $data['user']],
            'Registration successful.',
            201
        )->withCookie(AuthCookie::access($data['tokens']['access_token']))
            ->withCookie(AuthCookie::refresh($data['tokens']['refresh_token']));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $this->authService->login($request->validated());

        return ApiResponse::success(
            ['user' => $data['user']],
            'Login successful.'
        )->withCookie(AuthCookie::access($data['tokens']['access_token']))
            ->withCookie(AuthCookie::refresh($data['tokens']['refresh_token']));
    }

    public function refresh(Request $request): JsonResponse
    {
        $data = $this->authService->refreshFromToken(
            $request->cookie(config('auth_api.refresh_cookie_name')) ?: $request->bearerToken()
        );

        if (! $data) {
            abort(401, 'Unauthenticated.');
        }

        return ApiResponse::success(['user' => $data['user']], 'Token refreshed.')
            ->withCookie(AuthCookie::access($data['tokens']['access_token']))
            ->withCookie(AuthCookie::refresh($data['tokens']['refresh_token']));
    }

    public function session(Request $request): JsonResponse
    {
        $hasAccessToken = $this->authService->hasValidToken(
            $request->cookie(config('auth_api.access_cookie_name')) ?: $request->bearerToken(),
            'access'
        );

        $hasRefreshToken = $this->authService->hasValidToken(
            $request->cookie(config('auth_api.refresh_cookie_name')),
            'refresh'
        );

        return ApiResponse::success([
            'authenticated' => $hasAccessToken || $hasRefreshToken,
            'has_access_token' => $hasAccessToken,
            'has_refresh_token' => $hasRefreshToken,
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $this->authService->forgotPassword($request->validated('email'));

        return ApiResponse::success(
            [],
            'If an account exists for that email, a password reset link has been sent.'
        );
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $this->authService->resetPassword($request->validated());

        return ApiResponse::success([], 'Password reset successful.');
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        optional($user)->tokens()?->delete();

        return ApiResponse::success([], 'Logout successful.')
            ->withCookie(AuthCookie::forgetAccess())
            ->withCookie(AuthCookie::forgetRefresh());
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
            ],
        ]);
    }
}
