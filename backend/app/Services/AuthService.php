<?php

namespace App\Services;

use App\Models\GuestCustomer;
use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Role;

class AuthService
{
    public function register(array $data): array
    {
        $user = User::query()->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);

        $this->ensureCustomerRole($user);
        $this->linkGuestHistory($user);

        Log::info('auth.registered', ['user_id' => $user->id, 'email' => $user->email]);

        return [
            'user' => $this->serializeUser($user),
            'tokens' => $this->issueAccessToken($user),
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

        $this->ensureCustomerRole($user);

        return [
            'user' => $this->serializeUser($user),
            'tokens' => $this->issueAccessToken($user),
        ];
    }

    public function userFromToken(?string $plainTextToken): ?User
    {
        if (! $plainTextToken) {
            return null;
        }

        $token = PersonalAccessToken::findToken($plainTextToken);

        if (! $token || ! in_array('access', $token->abilities ?? [], true)) {
            return null;
        }

        if ($token->expires_at && $token->expires_at->isPast()) {
            return null;
        }

        $tokenable = $token->tokenable;

        if (! $tokenable instanceof User) {
            return null;
        }

        $touchInterval = max(1, (int) config('auth_api.token_touch_interval_minutes', 10));
        if (! $token->last_used_at || $token->last_used_at->lte(now()->subMinutes($touchInterval))) {
            $token->forceFill([
                'last_used_at' => now(),
                'expires_at' => now()->addMinutes(config('auth_api.access_token_expiration_minutes')),
            ])->save();
        }

        return $tokenable;
    }

    public function hasValidToken(?string $plainTextToken): bool
    {
        if (! $plainTextToken) {
            return false;
        }

        $token = PersonalAccessToken::findToken($plainTextToken);

        return (bool) $token
            && in_array('access', $token->abilities ?? [], true)
            && (! $token->expires_at || $token->expires_at->isFuture())
            && $token->tokenable instanceof User;
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

    private function issueAccessToken(Authenticatable $user): array
    {
        $access = $this->createToken($user, 'access-token', ['access'], config('auth_api.access_token_expiration_minutes'));

        return [
            'token_type' => 'Bearer',
            'access_token' => $access->plainTextToken,
            'access_token_expires_at' => optional($access->accessToken->expires_at)->toISOString(),
        ];
    }

    private function createToken(Authenticatable $user, string $name, array $abilities, int $minutes): NewAccessToken
    {
        return $user->createToken($name, $abilities, now()->addMinutes($minutes));
    }

    public function serializeUser(User|Authenticatable $user): array
    {
        if ($user instanceof User) {
            $user->loadMissing('roles:id,name');
        }

        $roles = $user instanceof User
            ? $user->roles->pluck('name')->values()->all()
            : [];
        $payload = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user instanceof User ? $this->avatarUrl($user->avatar) : null,
            'roles' => $roles,
        ];

        if ($user instanceof User && collect($roles)->contains(fn (string $role): bool => $role !== 'user')) {
            $payload['permissions'] = $user->getAllPermissions()->pluck('name')->values()->all();
        }

        return $payload;
    }

    private function ensureCustomerRole(User $user): void
    {
        if (! Role::query()->where('name', 'user')->where('guard_name', 'web')->exists()) {
            return;
        }

        if (! $user->roles()->exists()) {
            $user->assignRole('user');
            $user->loadMissing('roles:id,name');
        }
    }

    private function linkGuestHistory(User $user): void
    {
        $guestIds = GuestCustomer::query()
            ->whereNull('linked_user_id')
            ->whereNotNull('email')
            ->whereRaw('lower(email) = ?', [mb_strtolower($user->email)])
            ->pluck('id');

        if ($guestIds->isEmpty()) {
            return;
        }

        GuestCustomer::query()->whereIn('id', $guestIds)->update(['linked_user_id' => $user->id]);
        Order::query()
            ->whereNull('user_id')
            ->whereIn('guest_customer_id', $guestIds)
            ->update(['user_id' => $user->id]);
    }

    private function avatarUrl(?string $avatar): ?string
    {
        if (! $avatar) {
            return null;
        }

        if (str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')) {
            return $avatar;
        }

        if (str_starts_with($avatar, '/storage/') || str_starts_with($avatar, 'storage/')) {
            return url($avatar);
        }

        return url(Storage::disk('public')->url($avatar));
    }
}
