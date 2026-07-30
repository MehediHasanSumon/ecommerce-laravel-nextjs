<?php

namespace App\Services\Courier;

use App\Mail\CourierShipmentStatusMail;
use App\Models\CourierShipment;
use Illuminate\Support\Facades\Mail;

class CourierNotificationService
{
    public function __construct(private readonly CourierManager $manager) {}

    public function queueStatusEmail(CourierShipment $shipment): void
    {
        $order = $shipment->relationLoaded('order')
            ? $shipment->order
            : $shipment->order()->with('user:id,name,email')->first();
        if (! $order) {
            return;
        }

        $billing = (array) $order->billing_address;
        $email = $order->user?->email ?? ($billing['email'] ?? null);
        if (! is_string($email) || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        Mail::to($email)->queue(new CourierShipmentStatusMail(
            customerName: $order->user?->name ?? ($billing['full_name'] ?? 'Customer'),
            orderNumber: $order->order_number,
            courierName: $this->manager->provider($shipment->provider)->label(),
            status: $shipment->status,
            trackingNumber: $shipment->tracking_number,
            trackingUrl: $shipment->tracking_url,
        ));
    }
}
