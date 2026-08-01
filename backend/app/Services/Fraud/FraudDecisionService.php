<?php

namespace App\Services\Fraud;

use App\Models\FraudCheck;
use App\Models\Order;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Validation\ValidationException;

class FraudDecisionService
{
    public function __construct(private readonly StoreSettingsService $settings) {}

    public function evaluate(int $score, string $riskLevel): array
    {
        $settings = $this->settings->get();
        $threshold = (int) $settings->fraud_score_threshold;
        $criticalThreshold = max($threshold, (int) $settings->fraud_critical_score_threshold);
        $highRisk = in_array($riskLevel, ['high', 'critical'], true);
        $critical = $riskLevel === 'critical' || $score >= $criticalThreshold;

        return [
            'flag' => (bool) $settings->fraud_auto_flag_suspicious_orders && $score >= $threshold,
            'hold' => (bool) $settings->fraud_auto_hold_high_risk_orders && $highRisk,
            'reject' => (bool) $settings->fraud_auto_reject_critical_risk_orders && $critical,
            'block_cod' => (bool) $settings->fraud_block_cod_high_risk && $highRisk,
            'requires_admin_approval' => (bool) $settings->fraud_require_admin_approval && $highRisk,
            'threshold' => $threshold,
            'critical_threshold' => $criticalThreshold,
        ];
    }

    public function applyToOrder(Order $order, FraudCheck $check): Order
    {
        $decision = (array) $check->decision;
        $requiresApproval = (bool) ($decision['requires_admin_approval'] ?? false);

        $order->forceFill([
            'latest_fraud_check_id' => $check->id,
            'fraud_status' => $check->risk_level,
            'fraud_score' => $check->risk_score,
            'fraud_checked_at' => $check->checked_at,
            'fraud_flagged' => (bool) ($decision['flag'] ?? false),
            'fraud_hold' => (bool) ($decision['hold'] ?? false),
            'fraud_cod_blocked' => (bool) ($decision['block_cod'] ?? false),
            'fraud_approved_at' => $requiresApproval ? null : $order->fraud_approved_at,
            'fraud_approved_by' => $requiresApproval ? null : $order->fraud_approved_by,
        ])->save();

        return $order->fresh(['latestFraudCheck.providerResults']);
    }

    public function assertCheckoutAllowed(FraudCheck $check, bool $isCod): void
    {
        $decision = (array) $check->decision;
        if ($decision['reject'] ?? false) {
            throw ValidationException::withMessages([
                'order' => ['This order requires administrator review because the fraud risk is critical.'],
            ]);
        }
        if ($isCod && ($decision['block_cod'] ?? false)) {
            throw ValidationException::withMessages([
                'payment_method' => ['Cash on delivery is unavailable for this order until an administrator reviews the fraud result.'],
            ]);
        }
    }

    public function assertShipmentAllowed(Order $order): void
    {
        if ($order->fraud_approved_at) {
            return;
        }

        if ($order->fraud_hold || data_get($order->latestFraudCheck?->decision, 'requires_admin_approval') === true) {
            throw ValidationException::withMessages([
                'order' => ['Shipment is blocked until an administrator approves the high-risk fraud result.'],
            ]);
        }
    }

    public function approve(Order $order, int $userId): Order
    {
        $order->forceFill([
            'fraud_hold' => false,
            'fraud_cod_blocked' => false,
            'fraud_approved_at' => now(),
            'fraud_approved_by' => $userId,
        ])->save();

        return $order->fresh(['latestFraudCheck.providerResults', 'fraudApprover:id,name']);
    }
}
