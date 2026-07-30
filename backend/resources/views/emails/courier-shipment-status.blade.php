<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Shipment update</title>
</head>
<body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e4e7">
                    <tr>
                        <td style="padding:24px">
                            <h1 style="margin:0 0 16px;font-size:22px">Shipment update</h1>
                            <p style="margin:0 0 12px;line-height:1.6">Hello {{ $customerName }},</p>
                            <p style="margin:0 0 12px;line-height:1.6">
                                Your order <strong>{{ $orderNumber }}</strong> is now
                                <strong>{{ \Illuminate\Support\Str::headline($status) }}</strong>
                                with {{ $courierName }}.
                            </p>
                            @if ($trackingNumber)
                                <p style="margin:0 0 12px;line-height:1.6">Tracking number: <strong>{{ $trackingNumber }}</strong></p>
                            @endif
                            @if ($trackingUrl)
                                <p style="margin:20px 0 0">
                                    <a href="{{ $trackingUrl }}" style="display:inline-block;background:#18181b;color:#ffffff;padding:10px 16px;text-decoration:none">Track shipment</a>
                                </p>
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
