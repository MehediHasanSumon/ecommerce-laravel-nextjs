<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Responses\ApiResponse;
use App\Http\Responses\AuthCookie;
use App\Models\User;
use App\Services\Admin\Settings\StoreSettingsService;
use App\Services\AuthService;
use App\Services\Fraud\FraudAutomationService;
use App\Services\Marketing\MarketingEventService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService,
        private readonly StoreSettingsService $storeSettings,
        private readonly FraudAutomationService $fraudAutomation,
        private readonly MarketingEventService $marketingEvents,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        if (! $this->storeSettings->get()->allow_customer_registration) {
            throw ValidationException::withMessages([
                'registration' => ['Customer registration is currently disabled.'],
            ]);
        }

        $data = $this->authService->register($request->validated());
        $registered = User::query()->find($data['user']['id'] ?? null);
        if ($registered) {
            $this->fraudAutomation->queueCustomer($registered);
            $this->marketingEvents->track(
                'complete_registration',
                ['user' => ['id' => $registered->id, 'email' => $registered->email, 'phone' => $registered->phone]],
                $request,
                user: $registered,
                eventId: $request->header('X-Marketing-Event-Id'),
            );
        }

        return ApiResponse::success(
            ['user' => $data['user']],
            'Registration successful.',
            201
        )->withCookie(AuthCookie::access($data['tokens']['access_token']));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $this->authService->login($request->validated());
        $user = User::query()->find($data['user']['id'] ?? null);
        if ($user) {
            $this->marketingEvents->track(
                'login',
                ['user' => ['id' => $user->id, 'email' => $user->email, 'phone' => $user->phone]],
                $request,
                user: $user,
                eventId: $request->header('X-Marketing-Event-Id'),
            );
        }

        return ApiResponse::success(
            ['user' => $data['user']],
            'Login successful.'
        )->withCookie(AuthCookie::access($data['tokens']['access_token']));
    }

    public function session(Request $request): JsonResponse
    {
        $plainTextToken = $request->cookie(config('auth_api.access_cookie_name')) ?: $request->bearerToken();
        $user = $this->authService->userFromToken($plainTextToken);

        $response = ApiResponse::success([
            'authenticated' => (bool) $user,
            'has_access_token' => (bool) $user,
            'user' => $user ? $this->authService->serializeUser($user) : null,
        ]);

        return $response;
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
        $this->marketingEvents->track(
            'logout',
            ['user' => $user?->only(['id', 'email', 'phone'])],
            $request,
            user: $user,
            eventId: $request->header('X-Marketing-Event-Id'),
        );

        optional($user)->tokens()?->delete();

        return ApiResponse::success([], 'Logout successful.')
            ->withCookie(AuthCookie::forgetAccess());
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'user' => $this->authService->serializeUser($request->user()),
        ]);
    }
}
