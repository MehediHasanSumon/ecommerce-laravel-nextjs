<?php

namespace App\Services\Security;

use App\Models\SecurityAttempt;
use App\Services\Admin\IpBlockManagementService;
use App\Support\Security\IpAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SecurityAbuseService
{
    public function __construct(
        private readonly SecuritySettingsService $settings,
        private readonly IpBlockStateService $state,
        private readonly IpBlockManagementService $blocks,
        private readonly TrustedClientIpResolver $resolver,
    ) {}

    public function record(string $event, Request $request, array $metadata = []): void
    {
        $ip = $this->resolver->resolve($request);
        $settings = $this->settings->get();

        if (! $settings->auto_blocking_enabled || $ip === null || IpAddress::isLocal($ip) || $this->state->isWhitelisted($ip)) {
            return;
        }

        $threshold = $this->threshold($event, $settings);
        if ($threshold < 1) {
            return;
        }

        $windowSeconds = max(60, (int) $settings->time_window_minutes * 60);
        $bucket = intdiv(now()->timestamp, $windowSeconds);
        $key = 'security.ip-blocking.attempt.'.hash('sha256', "{$event}|{$ip}|{$bucket}");
        Cache::add($key, 0, $windowSeconds + 60);
        $attempts = (int) Cache::increment($key);
        $triggered = $attempts >= $threshold;

        if ($triggered) {
            $lock = Cache::lock($key.'.lock', 10);
            if ($lock->get()) {
                try {
                    $this->blocks->automaticBlock($ip, $this->reason($event), [
                        'event' => $event,
                        'attempts' => $attempts,
                        'threshold' => $threshold,
                        'window_minutes' => (int) $settings->time_window_minutes,
                    ], $request);
                } finally {
                    $lock->release();
                }
            }
        }

        if ($triggered || ! in_array($event, ['api_request', 'bot_request'], true)) {
            SecurityAttempt::query()->create([
                'ip_address' => $ip,
                'event_type' => $event,
                'route' => mb_substr((string) $request->route()?->uri(), 0, 255) ?: null,
                'user_id' => $request->user()?->id,
                'identifier_hash' => $this->identifierHash($request),
                'user_agent_hash' => $request->userAgent() ? hash('sha256', $request->userAgent()) : null,
                'request_id' => $request->headers->get('X-Request-ID'),
                'triggered_block' => $triggered,
                'metadata' => ['attempts' => $attempts, ...$metadata],
                'occurred_at' => now(),
            ]);
        }
    }

    private function threshold(string $event, object $settings): int
    {
        return (int) match ($event) {
            'failed_login' => $settings->max_failed_login_attempts,
            'password_reset' => $settings->max_password_reset_attempts,
            'otp' => $settings->max_otp_attempts,
            'registration' => $settings->max_registration_attempts,
            'api_request' => $settings->max_api_requests,
            'checkout' => $settings->max_checkout_requests,
            'contact_submission' => $settings->max_contact_submissions,
            'invalid_auth' => $settings->max_invalid_auth_attempts,
            'payment_failure' => $settings->max_payment_failures,
            'not_found' => $settings->max_not_found_requests,
            'bot_request' => $settings->max_bot_requests,
            default => 0,
        };
    }

    private function reason(string $event): string
    {
        return match ($event) {
            'failed_login' => 'Too Many Login Attempts',
            'password_reset' => 'Password Reset Abuse',
            'otp' => 'OTP Abuse',
            'registration' => 'Registration Abuse',
            'api_request' => 'API Abuse',
            'checkout' => 'Checkout Abuse',
            'contact_submission' => 'Contact Form Abuse',
            'invalid_auth' => 'Repeated Invalid Authentication',
            'payment_failure' => 'Repeated Payment Failures',
            'not_found' => 'Excessive 404 Scanning',
            'bot_request' => 'Suspicious Bot Activity',
            default => 'Suspicious Activity',
        };
    }

    private function identifierHash(Request $request): ?string
    {
        $identifier = $request->input('email') ?? $request->input('mobile') ?? $request->input('challenge_id');

        return is_scalar($identifier) && trim((string) $identifier) !== ''
            ? hash('sha256', mb_strtolower(trim((string) $identifier)))
            : null;
    }
}
