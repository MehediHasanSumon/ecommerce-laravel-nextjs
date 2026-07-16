<?php

namespace App\Services\Sms;

use App\Jobs\SendSms;
use App\Models\Order;
use App\Models\SmsLog;
use App\Services\Admin\Settings\CompanySettingsService;
use App\Services\Admin\Settings\SmsSettingsService;
use Illuminate\Support\Str;

class SmsService
{
    public function __construct(
        private readonly SmsSettingsService $settings,
        private readonly SmsTemplateRenderer $templates,
        private readonly PhoneNumberNormalizer $phones,
        private readonly CompanySettingsService $companySettings,
    ) {}

    public function queue(string $event, string $recipient, array $context = [], ?Order $order = null): ?SmsLog
    {
        $settings = $this->settings->get();
        if (! $settings->enabled || ! $this->eventEnabled($event, $settings->toArray())) {
            return null;
        }

        $context['store_name'] ??= $this->companySettings->get()->company_name;
        $message = $this->templates->render($event, $context);
        if (! $message || ! trim($recipient)) {
            return null;
        }

        $log = SmsLog::query()->create([
            'public_id' => (string) Str::uuid(),
            'order_id' => $order?->id,
            'recipient' => $this->phones->normalize($recipient, $settings),
            'type' => $event,
            'provider' => $settings->provider,
            'message' => $message,
            'status' => 'queued',
        ]);

        SendSms::dispatch($log->id)->afterCommit();

        return $log;
    }

    public function queueOrderEvent(string $event, Order $order, array $extra = []): ?SmsLog
    {
        $billing = (array) $order->billing_address;
        $customer = $order->user ?: $order->guestCustomer;
        $phone = $customer?->phone ?: ($billing['phone'] ?? '');
        $tracking = $order->shippingLogs()->latest()->value('tracking_number');

        return $this->queue($event, $phone, [
            'customer_name' => $customer?->name ?: ($billing['full_name'] ?? 'Customer'),
            'order_id' => $order->order_number,
            'order_status' => ucwords(str_replace('_', ' ', $extra['status'] ?? $order->status)),
            'payment_status' => ucwords(str_replace('_', ' ', $order->payment_status)),
            'tracking_number' => $tracking ?: '',
            'total_amount' => number_format($order->total_cents / 100, 2).' '.$order->currency,
            ...$extra,
        ], $order);
    }

    private function eventEnabled(string $event, array $settings): bool
    {
        if ($event === 'otp') {
            return true;
        }
        if ($event === 'order_confirmation') {
            return (bool) ($settings['order_confirmation_enabled'] ?? false);
        }
        if (str_starts_with($event, 'order_status_')) {
            $status = substr($event, strlen('order_status_'));

            return (bool) (($settings['order_status_events'][$status] ?? false));
        }
        if (str_starts_with($event, 'shipping_status_')) {
            $status = substr($event, strlen('shipping_status_'));

            return (bool) (($settings['shipping_status_events'][$status] ?? false));
        }

        return false;
    }
}
