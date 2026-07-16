<?php

namespace App\Services\Sms;

use App\Models\SmsOtpChallenge;
use App\Services\Admin\Settings\SmsSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutOtpService
{
    public function __construct(
        private readonly SmsSettingsService $settings,
        private readonly SmsService $sms,
        private readonly PhoneNumberNormalizer $phones,
    ) {}

    public function requirements(Request $request): array
    {
        $settings = $this->settings->get();
        $required = (bool) $settings->enabled && (bool) (
            $request->user()
                ? $settings->require_registered_checkout_otp
                : $settings->require_guest_checkout_otp
        );

        return [
            'required' => $required,
            'enabled' => (bool) $settings->enabled,
            'otp_length' => (int) $settings->otp_length,
            'expiration_minutes' => (int) $settings->otp_expiration_minutes,
            'resend_cooldown_seconds' => (int) $settings->otp_resend_cooldown_seconds,
        ];
    }

    public function issue(Request $request, string $mobile): array
    {
        $requirements = $this->requirements($request);
        if (! $requirements['required']) {
            return [...$requirements, 'verified' => true, 'challenge_id' => null];
        }

        $settings = $this->settings->get();
        $mobile = $this->phones->normalize($mobile, $settings);
        $recentCount = SmsOtpChallenge::query()
            ->where('mobile', $mobile)
            ->where('created_at', '>=', now()->subHour())
            ->count();
        if ($recentCount >= (int) $settings->otp_rate_limit_per_hour) {
            throw ValidationException::withMessages(['mobile' => ['Too many verification requests. Please try again later.']]);
        }

        $identity = $this->identity($request);
        $challenge = SmsOtpChallenge::query()
            ->where('mobile', $mobile)
            ->where('purpose', 'checkout')
            ->where('session_hash', $identity['session_hash'])
            ->whereNull('used_at')
            ->latest()
            ->first();

        if ($challenge && $challenge->last_sent_at->addSeconds((int) $settings->otp_resend_cooldown_seconds)->isFuture()) {
            throw ValidationException::withMessages([
                'mobile' => ['Please wait before requesting another verification code.'],
            ]);
        }
        if ($challenge && $challenge->resend_count >= (int) $settings->otp_max_resends) {
            throw ValidationException::withMessages([
                'mobile' => ['Maximum resend attempts reached. Please try again later.'],
            ]);
        }

        $length = (int) $settings->otp_length;
        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);
        $payload = [
            ...$identity,
            'mobile' => $mobile,
            'purpose' => 'checkout',
            'code_hash' => Hash::make($code),
            'verification_attempts' => 0,
            'last_sent_at' => now(),
            'expires_at' => now()->addMinutes((int) $settings->otp_expiration_minutes),
            'verified_at' => null,
            'used_at' => null,
        ];

        if ($challenge) {
            $challenge->update([
                ...$payload,
                'resend_count' => $challenge->resend_count + 1,
            ]);
        } else {
            $challenge = SmsOtpChallenge::query()->create([
                'public_id' => (string) Str::uuid(),
                ...$payload,
                'resend_count' => 0,
            ]);
        }

        $this->sms->queue('otp', $mobile, ['verification_code' => $code]);

        return [
            ...$requirements,
            'verified' => false,
            'challenge_id' => $challenge->public_id,
            'expires_at' => $challenge->expires_at->toISOString(),
            'resend_available_at' => $challenge->last_sent_at
                ->addSeconds((int) $settings->otp_resend_cooldown_seconds)
                ->toISOString(),
        ];
    }

    public function verify(Request $request, string $challengeId, string $mobile, string $code): array
    {
        $settings = $this->settings->get();
        $identity = $this->identity($request);
        $mobile = $this->phones->normalize($mobile, $settings);
        $challenge = SmsOtpChallenge::query()
            ->where('public_id', $challengeId)
            ->where('mobile', $mobile)
            ->where('session_hash', $identity['session_hash'])
            ->where('purpose', 'checkout')
            ->first();

        if (! $challenge || $challenge->used_at || $challenge->expires_at->isPast()) {
            throw ValidationException::withMessages(['code' => ['The verification code is invalid or expired.']]);
        }
        if ($challenge->verified_at) {
            return ['verified' => true, 'challenge_id' => $challenge->public_id];
        }
        if ($challenge->verification_attempts >= (int) $settings->otp_max_verification_attempts) {
            throw ValidationException::withMessages(['code' => ['Maximum verification attempts reached. Request a new code.']]);
        }

        $challenge->increment('verification_attempts');
        if (! Hash::check($code, $challenge->code_hash)) {
            throw ValidationException::withMessages(['code' => ['The verification code is invalid or expired.']]);
        }

        $challenge->update(['verified_at' => now()]);

        return ['verified' => true, 'challenge_id' => $challenge->public_id];
    }

    public function assertForCheckout(Request $request, ?string $challengeId, string $mobile): ?SmsOtpChallenge
    {
        if (! $this->requirements($request)['required']) {
            return null;
        }
        if (! $challengeId) {
            throw ValidationException::withMessages(['otp_verification_id' => ['Verify the checkout mobile number before payment.']]);
        }

        $identity = $this->identity($request);
        $mobile = $this->phones->normalize($mobile, $this->settings->get());
        $challenge = SmsOtpChallenge::query()
            ->where('public_id', $challengeId)
            ->where('mobile', $mobile)
            ->where('session_hash', $identity['session_hash'])
            ->whereNotNull('verified_at')
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->lockForUpdate()
            ->first();

        if (! $challenge) {
            throw ValidationException::withMessages(['otp_verification_id' => ['Mobile verification is invalid or expired.']]);
        }

        return $challenge;
    }

    public function consume(?SmsOtpChallenge $challenge): void
    {
        $challenge?->update(['used_at' => now()]);
    }

    private function identity(Request $request): array
    {
        $guestToken = (string) $request->header('X-Guest-Token');
        $sessionId = $request->hasSession() ? $request->session()->getId() : '';
        $authToken = (string) (
            $request->cookie(config('auth_api.access_cookie_name'))
            ?: $request->bearerToken()
            ?: ''
        );
        $identity = ($request->user()?->id ?: 'guest').'|'.$guestToken.'|'.$sessionId.'|'.hash('sha256', $authToken);

        return [
            'user_id' => $request->user()?->id,
            'guest_token_hash' => $guestToken !== '' ? hash('sha256', $guestToken) : null,
            'session_hash' => hash_hmac('sha256', $identity, (string) config('app.key')),
        ];
    }
}
