<?php

namespace App\Services\Pdf;

use App\Models\Order;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class OrderPdfService
{
    public function __construct(private readonly PdfRenderService $renderer) {}

    public function invoice(Order $order, string $context = 'invoice'): Response
    {
        $profile = CompanyPdfProfile::load();

        return $this->renderer->download('pdf.invoice', [
            'company' => $profile,
            'order' => $order,
            'transaction' => $order->transactions->first(),
            'context' => $context,
            'generatedAt' => now(),
        ], 'invoice-'.$order->order_number.'.pdf');
    }

    public function paidInvoice(Order $order): Response
    {
        if ($order->payment_status !== 'paid') {
            throw ValidationException::withMessages([
                'order' => ['Invoice is available after successful payment verification.'],
            ]);
        }

        return $this->invoice($order, 'payment');
    }

    public function deliverySlip(Order $order): Response
    {
        return $this->renderer->download('pdf.delivery-slip', [
            'company' => CompanyPdfProfile::load(),
            'order' => $order,
            'shippingLog' => $order->shippingLogs->first(),
            'generatedAt' => now(),
        ], 'delivery-slip-'.$order->order_number.'.pdf');
    }
}
