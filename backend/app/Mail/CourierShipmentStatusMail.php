<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CourierShipmentStatusMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $customerName,
        public readonly string $orderNumber,
        public readonly string $courierName,
        public readonly string $status,
        public readonly ?string $trackingNumber,
        public readonly ?string $trackingUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Shipment update for {$this->orderNumber}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.courier-shipment-status',
        );
    }
}
