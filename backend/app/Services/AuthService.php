<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);

        Log::info('auth.registered', ['user_id' => $user->id, 'email' => $user->email]);

        return [
            'user' => $this->serializeUser($user),
            'tokens' => $this->issueTokenPair($user),
        ];
    }

    public function login(array $credentials): array
    {
        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            Log::warning('auth.login_failed', ['email' => $credentials['email']]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are invalid.'],
            ]);
        }

        if (Hash::needsRehash($user->password)) {
            $user->forceFill(['password' => $credentials['password']])->save();
        }

        Log::info('auth.login_succeeded', ['user_id' => $user->id]);

        return [
            'user' => $this->serializeUser($user),
            'tokens' => $this->issueTokenPair($user),
        ];
    }

    public function refresh(Authenticatable $user): array
    {
        $token = $user->currentAccessToken();

        if (! $token || ! in_array('refresh', $token->abilities ?? [], true)) {
            abort(403, 'A valid refresh token is required.');
        }

        $token->delete();

        Log::info('auth.token_refreshed', ['user_id' => $user->getAuthIdentifier()]);

        return [
            'tokens' => $this->issueTokenPair($user),
        ];
    }

    public function userFromToken(?string $plainTextToken, string $ability): ?User
    {
        if (! $plainTextToken) {
            return null;
        }

        $token = PersonalAccessToken::findToken($plainTextToken);

        if (! $token || ! in_array($ability, $token->abilities ?? [], true)) {
            return null;
        }

        if ($token->expires_at && $token->expires_at->isPast()) {
            return null;
        }

        $tokenable = $token->tokenable;

        if (! $tokenable instanceof User) {
            return null;
        }

        $token->forceFill(['last_used_at' => now()])->save();

        return $tokenable;
    }

    public function hasValidToken(?string $plainTextToken, string $ability): bool
    {
        if (! $plainTextToken) {
            return false;
        }

        $token = PersonalAccessToken::findToken($plainTextToken);

        return (bool) $token
            && in_array($ability, $token->abilities ?? [], true)
            && (! $token->expires_at || $token->expires_at->isFuture())
            && $token->tokenable instanceof User;
    }

    public function refreshFromToken(?string $plainTextToken): ?array
    {
        $user = $this->userFromToken($plainTextToken, 'refresh');

        if (! $user) {
            $cachedTokens = $this->tokenPairFromRecentlyRotatedRefreshToken($plainTextToken);

            if ($cachedTokens) {
                return $cachedTokens;
            }

            return null;
        }

        $data = [
            'user' => $this->serializeUser($user),
            'tokens' => $this->issueTokenPair($user),
        ];

        $this->rememberRecentlyRotatedRefreshToken($plainTextToken, $data);
        PersonalAccessToken::findToken($plainTextToken)?->delete();

        Log::info('auth.cookie_token_refreshed', ['user_id' => $user->id]);

        return $data;
    }

    public function logout(Authenticatable $user): void
    {
        $token = $user->currentAccessToken();

        if ($token) {
            $token->delete();
        }

        Log::info('auth.logout', ['user_id' => $user->getAuthIdentifier()]);
    }

    public function forgotPassword(string $email): void
    {
        $status = Password::sendResetLink(['email' => $email]);

        Log::info('auth.password_reset_requested', [
            'email_hash' => hash('sha256', $email),
            'status' => $status,
        ]);
    }

    public function resetPassword(array $data): void
    {
        $status = Password::reset(
            $data,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();

                event(new PasswordReset($user));

                Log::notice('auth.password_reset_completed', ['user_id' => $user->id]);
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'token' => ['The password reset token is invalid or has expired.'],
            ]);
        }
    }

    private function issueTokenPair(Authenticatable $user): array
    {
        $access = $this->createToken($user, 'access-token', ['access'], config('auth_api.access_token_expiration_minutes'));
        $refresh = $this->createToken($user, 'refresh-token', ['refresh'], config('auth_api.refresh_token_expiration_minutes'));

        return [
            'token_type' => 'Bearer',
            'access_token' => $access->plainTextToken,
            'access_token_expires_at' => optional($access->accessToken->expires_at)->toISOString(),
            'refresh_token' => $refresh->plainTextToken,
            'refresh_token_expires_at' => optional($refresh->accessToken->expires_at)->toISOString(),
        ];
    }

    private function createToken(Authenticatable $user, string $name, array $abilities, int $minutes): NewAccessToken
    {
        return $user->createToken($name, $abilities, now()->addMinutes($minutes));
    }

    private function recentlyRotatedRefreshTokenKey(?string $plainTextToken): ?string
    {
        if (! $plainTextToken) {
            return null;
        }

        return 'auth:rotated-refresh:'.hash('sha256', $plainTextToken);
    }

    private function rememberRecentlyRotatedRefreshToken(?string $plainTextToken, array $data): void
    {
        $key = $this->recentlyRotatedRefreshTokenKey($plainTextToken);

        if (! $key) {
            return;
        }

        Cache::put(
            $key,
            Crypt::encryptString(json_encode($data, JSON_THROW_ON_ERROR)),
            now()->addSeconds(max(1, config('auth_api.refresh_token_reuse_grace_seconds')))
        );
    }

    private function tokenPairFromRecentlyRotatedRefreshToken(?string $plainTextToken): ?array
    {
        $key = $this->recentlyRotatedRefreshTokenKey($plainTextToken);

        if (! $key) {
            return null;
        }

        $cached = Cache::pull($key);

        if (is_string($cached)) {
            $data = json_decode(Crypt::decryptString($cached), true, flags: JSON_THROW_ON_ERROR);
            Log::info('auth.refresh_token_reuse_grace_used', ['user_id' => $data['user']['id'] ?? null]);

            return $data;
        }

        return null;
    }

    private function serializeUser(User|Authenticatable $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ];
    }
}
