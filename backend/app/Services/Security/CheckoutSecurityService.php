<?php

namespace App\Services\Security;

use App\Models\FraudCheck;
use App\Models\GuestCustomer;
use App\Models\Order;
use App\Models\SecurityAttempt;
use App\Models\User;
use App\Services\Admin\IpBlockManagementService;
use App\Services\Admin\Settings\StoreSettingsService;
use App\Services\Fraud\FraudAutomationService;
use App\Services\Fraud\FraudCheckService;
use App\Services\Fraud\FraudDecisionService;
use App\Support\Security\IpAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class CheckoutSecurityService
{
    public function __construct(
        private readonly SecuritySettingsService $securitySettings,
        private readonly StoreSettingsService $storeSettings,
        private readonly IpBlockStateService $ipState,
        private readonly IpBlockManagementService $ipBlocks,
        private readonly TrustedClientIpResolver $ipResolver,
        private readonly FraudAutomationService $fraudAutomation,
        private readonly FraudCheckService $fraudChecks,
        private readonly FraudDecisionService $fraudDecisions,
    ) {}

    public function evaluateCheckout(Request $request, array $payload, ?User $user = null, ?GuestCustomer $guest = null): array
    {
        $ip = $this->ipResolver->resolve($request);
        $security = $this->securitySettings->get();
        $store = $this->storeSettings->get();

        // 1. IP Block Pre-check
        if ($ip !== null && $this->ipState->isBlocked($ip)) {
            $this->logSecurityEvent('checkout_blocked_ip', $request, [
                'reason' => 'IP is actively blocked',
            ]);
            throw ValidationException::withMessages([
                'order' => ['Your request could not be completed at this time. Please contact support if you believe this is an error.'],
            ]);
        }

        if ($ip !== null && $this->ipState->isBlacklisted($ip)) {
            $this->logSecurityEvent('checkout_blacklisted_ip', $request, [
                'reason' => 'IP is blacklisted in access rules',
            ]);
            throw ValidationException::withMessages([
                'order' => ['Your request could not be completed at this time. Please contact support if you believe this is an error.'],
            ]);
        }

        $paymentMethod = (string) ($payload['payment_method'] ?? 'cash_on_delivery');
        $isCod = $paymentMethod === 'cash_on_delivery';

        // Extract customer identifiers
        $billing = (array) ($payload['billing_address'] ?? []);
        $phone = $this->extractPhone($billing['phone'] ?? $user?->phone ?? $guest?->phone);
        $email = filter_var($billing['email'] ?? $user?->email ?? $guest?->email, FILTER_VALIDATE_EMAIL) ?: null;

        $riskReasons = [];
        $internalScore = 0;

        // 2. COD Abuse & Past Order Signals
        if ($isCod && ($security->enable_cod_security ?? true)) {
            $codStats = $this->customerCodHistory($phone, $email, $user?->id, $guest?->id);
            $failedCodCount = $codStats['returned'] + $codStats['cancelled'];

            $failedCodThreshold = (int) ($security->failed_cod_threshold ?? 3);
            if ($failedCodThreshold > 0 && $failedCodCount >= $failedCodThreshold && $codStats['completed'] === 0) {
                $this->logSecurityEvent('cod_abuse_blocked', $request, [
                    'phone' => $phone,
                    'failed_cod_count' => $failedCodCount,
                    'threshold' => $failedCodThreshold,
                ]);

                throw ValidationException::withMessages([
                    'payment_method' => ['Cash on delivery is currently unavailable for your account. Please select an online payment method.'],
                ]);
            }

            if ($failedCodCount > 1) {
                $internalScore += min(40, $failedCodCount * 15);
                $riskReasons[] = "Customer has {$failedCodCount} previous cancelled or returned COD orders.";
            }
        }

        // 3. Payment Failure Signals from this IP
        if ($ip !== null && ! IpAddress::isLocal($ip)) {
            $failures = $this->getPaymentFailures($ip, (int) $security->time_window_minutes);
            if ($failures > 0) {
                if ($failures >= (int) $security->max_payment_failures) {
                    $internalScore += 60;
                    $riskReasons[] = "Multiple recent payment failures ({$failures}) detected from this IP.";
                } elseif ($failures >= 2) {
                    $internalScore += 25;
                    $riskReasons[] = "Recent payment failures ({$failures}) detected from this IP.";
                }
            }

            // Rapid order creation detection from same IP in short window
            $recentOrdersFromIp = Order::query()
                ->where('client_ip', $ip)
                ->where('created_at', '>=', now()->subMinutes(15))
                ->count();
            if ($recentOrdersFromIp >= 4) {
                $internalScore += 30;
                $riskReasons[] = "High order volume ({$recentOrdersFromIp} orders in 15 mins) from this IP.";
            }
        }

        // 4. External Fraud Provider Intelligence (if configured and enabled)
        $fraudCheck = null;
        $fraudScore = 0;
        $fraudRiskLevel = 'safe';

        if ($store->fraud_detection_enabled && ($store->fraud_check_during_checkout || ($isCod && $store->fraud_check_before_cod_confirmation))) {
            try {
                $fraudBilling = (array) ($payload['billing_address'] ?? []);
                $fraudShipping = (bool) ($payload['same_as_billing'] ?? true) ? $fraudBilling : (array) ($payload['shipping_address'] ?? []);

                $fraudCheck = $this->fraudAutomation->checkCheckout([
                    'phone' => $phone,
                    'name' => $billing['full_name'] ?? $user?->name ?? $guest?->name,
                    'email' => $email,
                    'ip_address' => $ip,
                    'billing_address' => $fraudBilling,
                    'shipping_address' => $fraudShipping,
                    'customer_id' => $user ? "registered-{$user->id}" : ($guest ? "guest-{$guest->id}" : null),
                ], $paymentMethod, $user, $guest);

                if ($fraudCheck) {
                    $fraudScore = (int) $fraudCheck->risk_score;
                    $fraudRiskLevel = $fraudCheck->risk_level;
                    if (! empty($fraudCheck->risk_reasons)) {
                        $riskReasons = array_merge($riskReasons, (array) $fraudCheck->risk_reasons);
                    }
                }
            } catch (ValidationException $e) {
                throw $e;
            } catch (Throwable $e) {
                report($e);
            }
        }

        // 5. Aggregate Composite Risk Score & Level
        $compositeScore = min(100, max($internalScore, $fraudScore));
        $scoreThreshold = (int) ($store->fraud_score_threshold ?? 60);
        $criticalThreshold = (int) ($store->fraud_critical_score_threshold ?? 85);

        $riskLevel = match (true) {
            $compositeScore >= $criticalThreshold => 'critical',
            $compositeScore >= max(70, $scoreThreshold) => 'high',
            $compositeScore >= max(45, $scoreThreshold) => 'medium',
            $compositeScore >= 20 => 'low',
            default => 'safe',
        };

        $isHigh = in_array($riskLevel, ['high', 'critical'], true);
        $isCritical = $riskLevel === 'critical' || $compositeScore >= $criticalThreshold;

        // 6. Enforce Decisions
        if ($isCritical && (bool) ($store->fraud_auto_reject_critical_risk_orders ?? false)) {
            if ($ip !== null && (bool) ($security->auto_block_critical_ips ?? false) && ! IpAddress::isLocal($ip)) {
                $this->ipBlocks->automaticBlock($ip, 'Critical Checkout Fraud Risk', [
                    'score' => $compositeScore,
                    'reasons' => $riskReasons,
                ], $request);
            }

            $this->logSecurityEvent('checkout_critical_rejected', $request, [
                'score' => $compositeScore,
                'reasons' => $riskReasons,
            ]);

            throw ValidationException::withMessages([
                'order' => ['Your request could not be completed at this time. Please contact support if you believe this is an error.'],
            ]);
        }

        if ($isCod && $isHigh && (bool) ($store->fraud_block_cod_high_risk ?? true)) {
            $this->logSecurityEvent('checkout_cod_high_risk_blocked', $request, [
                'score' => $compositeScore,
                'reasons' => $riskReasons,
            ]);

            throw ValidationException::withMessages([
                'payment_method' => ['Cash on delivery is unavailable for this order. Please select an online payment method.'],
            ]);
        }

        $hold = $isHigh && (bool) ($store->fraud_auto_hold_high_risk_orders ?? true);
        $flag = $compositeScore >= $scoreThreshold && (bool) ($store->fraud_auto_flag_suspicious_orders ?? true);
        $fraudStatus = match (true) {
            $isCritical => 'critical',
            $isHigh => 'high',
            $compositeScore >= $scoreThreshold => 'suspicious',
            $compositeScore >= 20 => 'monitoring',
            default => 'safe',
        };

        $this->logSecurityEvent('checkout_evaluated', $request, [
            'payment_method' => $paymentMethod,
            'composite_score' => $compositeScore,
            'risk_level' => $riskLevel,
            'fraud_status' => $fraudStatus,
            'fraud_hold' => $hold,
            'fraud_flagged' => $flag,
        ]);

        return [
            'risk_score' => $compositeScore,
            'risk_level' => $riskLevel,
            'fraud_status' => $fraudStatus,
            'fraud_hold' => $hold,
            'fraud_flagged' => $flag,
            'risk_reasons' => array_values(array_unique($riskReasons)),
            'fraud_check' => $fraudCheck,
        ];
    }

    public function recordPaymentFailure(Request $request, ?Order $order, string $gateway, ?string $reason = null): void
    {
        $ip = $this->ipResolver->resolve($request);
        if ($ip === null || IpAddress::isLocal($ip)) {
            return;
        }

        $security = $this->securitySettings->get();
        $windowSeconds = max(60, (int) $security->time_window_minutes * 60);
        $bucket = intdiv(now()->timestamp, $windowSeconds);
        $key = 'security.payment_failure.'.hash('sha256', "{$ip}|{$bucket}");

        Cache::add($key, 0, $windowSeconds + 60);
        $failures = (int) Cache::increment($key);

        $threshold = (int) $security->max_payment_failures;
        $triggered = $security->auto_blocking_enabled && $failures >= $threshold;

        if ($triggered) {
            $lock = Cache::lock($key.'.lock', 10);
            if ($lock->get()) {
                try {
                    $this->ipBlocks->automaticBlock($ip, 'Repeated Payment Failures', [
                        'event' => 'payment_failure',
                        'failures' => $failures,
                        'threshold' => $threshold,
                        'window_minutes' => (int) $security->time_window_minutes,
                        'order_id' => $order?->order_number,
                        'gateway' => $gateway,
                    ], $request);
                } finally {
                    $lock->release();
                }
            }
        }

        $this->logSecurityEvent('payment_failure', $request, [
            'failures' => $failures,
            'threshold' => $threshold,
            'gateway' => $gateway,
            'order_id' => $order?->order_number,
            'reason' => $reason,
            'triggered_block' => $triggered,
        ]);
    }

    public function recordPaymentSuccess(Request $request, Order $order): void
    {
        $ip = $this->ipResolver->resolve($request);
        if ($ip === null) {
            return;
        }

        $security = $this->securitySettings->get();
        $windowSeconds = max(60, (int) $security->time_window_minutes * 60);
        $bucket = intdiv(now()->timestamp, $windowSeconds);
        $key = 'security.payment_failure.'.hash('sha256', "{$ip}|{$bucket}");

        Cache::forget($key);

        $this->logSecurityEvent('payment_success', $request, [
            'order_id' => $order->order_number,
            'gateway' => $order->payment_method,
            'amount_cents' => $order->total_cents,
        ]);
    }

    private function customerCodHistory(?string $phone, ?string $email, ?int $userId, ?int $guestId): array
    {
        if (! $phone && ! $email && ! $userId && ! $guestId) {
            return ['completed' => 0, 'cancelled' => 0, 'returned' => 0, 'total' => 0];
        }

        $orders = Order::query()
            ->where('payment_method', 'cash_on_delivery')
            ->where(function ($query) use ($phone, $email, $userId, $guestId): void {
                if ($userId) {
                    $query->orWhere('user_id', $userId);
                }
                if ($guestId) {
                    $query->orWhere('guest_customer_id', $guestId);
                }
                if ($phone) {
                    $query->orWhere('billing_address->phone', $phone)
                        ->orWhere('shipping_address->phone', $phone);
                }
                if ($email) {
                    $query->orWhere('billing_address->email', $email)
                        ->orWhere('shipping_address->email', $email);
                }
            })
            ->get(['status', 'shipping_status', 'payment_status']);

        $completed = $orders->filter(fn ($o) => in_array($o->status, ['completed', 'delivered', 'confirmed'], true) || $o->shipping_status === 'delivered')->count();
        $cancelled = $orders->filter(fn ($o) => $o->status === 'cancelled')->count();
        $returned = $orders->filter(fn ($o) => in_array($o->status, ['returned', 'failed'], true) || in_array($o->shipping_status, ['returned', 'failed'], true))->count();

        return [
            'completed' => $completed,
            'cancelled' => $cancelled,
            'returned' => $returned,
            'total' => $orders->count(),
        ];
    }

    private function getPaymentFailures(string $ip, int $windowMinutes): int
    {
        $windowSeconds = max(60, $windowMinutes * 60);
        $bucket = intdiv(now()->timestamp, $windowSeconds);
        $key = 'security.payment_failure.'.hash('sha256', "{$ip}|{$bucket}");

        return (int) Cache::get($key, 0);
    }

    private function extractPhone(mixed $phone): ?string
    {
        $clean = preg_replace('/\D+/', '', (string) $phone);
        if (str_starts_with($clean, '880')) {
            $clean = '0'.substr($clean, 3);
        }

        return $clean ?: null;
    }

    private function logSecurityEvent(string $eventType, Request $request, array $metadata = []): void
    {
        try {
            $ip = $this->ipResolver->resolve($request);
            SecurityAttempt::query()->create([
                'ip_address' => $ip ?? '0.0.0.0',
                'event_type' => $eventType,
                'route' => mb_substr((string) $request->route()?->uri(), 0, 255) ?: null,
                'user_id' => $request->user()?->id,
                'identifier_hash' => $ip ? hash('sha256', $ip) : null,
                'user_agent_hash' => $request->userAgent() ? hash('sha256', $request->userAgent()) : null,
                'request_id' => $request->headers->get('X-Request-ID'),
                'triggered_block' => $metadata['triggered_block'] ?? false,
                'metadata' => $metadata,
                'occurred_at' => now(),
            ]);
        } catch (Throwable) {
            // Logging is best effort.
        }
    }
}
