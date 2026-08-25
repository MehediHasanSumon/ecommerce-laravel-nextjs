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
            'otp_length' => (int) ($settings->otp_length ?? 6),
            'expiration_minutes' => (int) ($settings->otp_expiration_minutes ?? 5),
            'resend_cooldown_seconds' => 60,
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
        if ($recentCount >= 10) {
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

        if ($challenge && $challenge->last_sent_at->addSeconds(60)->isFuture()) {
            throw ValidationException::withMessages([
                'mobile' => ['Please wait before requesting another verification code.'],
            ]);
        }
        if ($challenge && $challenge->resend_count >= 3) {
            throw ValidationException::withMessages([
                'mobile' => ['Maximum resend attempts reached. Please try again later.'],
            ]);
        }

        $length = (int) ($settings->otp_length ?? 6);
        $code = str_pad((string) random_int(0, (10 ** $length) - 1), $length, '0', STR_PAD_LEFT);
        $payload = [
            ...$identity,
            'mobile' => $mobile,
            'purpose' => 'checkout',
            'code_hash' => Hash::make($code),
            'verification_attempts' => 0,
            'last_sent_at' => now(),
            'expires_at' => now()->addMinutes((int) ($settings->otp_expiration_minutes ?? 5)),
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
                ->addSeconds(60)
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
        if ($challenge->verification_attempts >= 5) {
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
            ->where('purpose', 'checkout')
            ->first();

        if (! $challenge || ! $challenge->verified_at || $challenge->used_at || $challenge->expires_at->isPast()) {
            throw ValidationException::withMessages(['otp_verification_id' => ['The mobile verification session is invalid or expired. Please verify again.']]);
        }

        return $challenge;
    }

    public function markUsed(?SmsOtpChallenge $challenge): void
    {
        $challenge?->update(['used_at' => now()]);
    }

    public function consume(?SmsOtpChallenge $challenge): void
    {
        $this->markUsed($challenge);
    }

    private function identity(Request $request): array
    {
        $guestToken = $request->header('X-Guest-Token');
        $user = $request->user();
        $sessionSeed = $user
            ? "user:{$user->id}"
            : 'guest:'.($guestToken ?: $request->ip().':'.$request->userAgent());

        return [
            'user_id' => $user?->id,
            'guest_token_hash' => $guestToken ? hash('sha256', $guestToken) : null,
            'session_hash' => hash('sha256', $sessionSeed),
        ];
    }
}
