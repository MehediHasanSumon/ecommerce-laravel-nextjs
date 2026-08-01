<?php

namespace App\Services\Fraud;

use App\Jobs\RunFraudCheck;
use App\Models\GuestCustomer;
use App\Models\Order;
use App\Models\User;
use App\Services\Admin\Settings\StoreSettingsService;

class FraudAutomationService
{
    public function __construct(
        private readonly StoreSettingsService $settings,
        private readonly FraudCheckService $checks,
        private readonly FraudDecisionService $decisions,
    ) {}

    public function checkCheckout(array $input, string $paymentMethod, ?User $user = null, ?GuestCustomer $guest = null): ?\App\Models\FraudCheck
    {
        $settings = $this->settings->get();
        if (! $settings->fraud_detection_enabled) {
            return null;
        }
        $isCod = $paymentMethod === 'cash_on_delivery';
        if (! $settings->fraud_check_during_checkout && ! ($isCod && $settings->fraud_check_before_cod_confirmation)) {
            return null;
        }

        $check = $this->checks->check(
            $input,
            'checkout',
            null,
            null,
            $user,
            $guest,
            'checkout',
            true,
        );
        $this->decisions->assertCheckoutAllowed($check, $isCod);

        return $check;
    }

    public function checkOrderCreation(
        array $input,
        string $paymentMethod,
        ?User $user = null,
        ?GuestCustomer $guest = null,
        string $trigger = 'manual_order_creation',
        ?int $actorId = null,
    ): ?\App\Models\FraudCheck {
        $settings = $this->settings->get();
        if (! $settings->fraud_detection_enabled || ! $settings->fraud_auto_check_orders) {
            return null;
        }

        $check = $this->checks->check(
            $input,
            'order_creation',
            null,
            null,
            $user,
            $guest,
            $trigger,
            true,
            $actorId,
        );
        $this->decisions->assertCheckoutAllowed($check, $paymentMethod === 'cash_on_delivery');

        return $check;
    }

    public function queueOrder(Order $order, string $trigger = 'order_created', bool $bypassCache = false): void
    {
        $settings = $this->settings->get();
        if ($settings->fraud_detection_enabled && $settings->fraud_auto_check_orders) {
            RunFraudCheck::dispatch('order', (string) $order->id, $trigger, true, null, $bypassCache)->afterCommit();
        }
    }

    public function queueCustomer(User $user, string $trigger = 'customer_registration'): void
    {
        $settings = $this->settings->get();
        if ($settings->fraud_detection_enabled && $settings->fraud_auto_check_customers && filled($user->phone)) {
            RunFraudCheck::dispatch('registered', (string) $user->id, $trigger, true)->afterCommit();
        }
    }

    public function checkBeforeShipment(Order $order): void
    {
        $settings = $this->settings->get();
        if (! $settings->fraud_detection_enabled || ! $settings->fraud_check_before_shipment) {
            return;
        }

        $order->loadMissing(['user', 'guestCustomer', 'latestFraudCheck']);
        $check = $this->checks->check(
            $this->checks->inputForOrder($order),
            'order',
            $order->order_number,
            $order,
            $order->user,
            $order->guestCustomer,
            'before_shipment',
            true,
        );
        $order->setRelation('latestFraudCheck', $check);
        $this->decisions->assertShipmentAllowed($order->fresh('latestFraudCheck'));
    }
}
