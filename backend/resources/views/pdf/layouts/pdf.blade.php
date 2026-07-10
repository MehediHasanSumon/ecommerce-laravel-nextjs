<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $title ?? 'PDF' }}</title>
    <style>
        @page { margin: 28px 34px 48px; }
        body { color: #111827; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 12px; line-height: 1.45; margin: 0; }
        h1, h2, h3, p { margin: 0; }
        h1 { font-size: 24px; }
        h2 { font-size: 15px; margin-bottom: 10px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 8px 9px; text-align: left; vertical-align: top; }
        th { background: #f9fafb; color: #4b5563; font-size: 10px; letter-spacing: .03em; text-transform: uppercase; }
        .muted { color: #6b7280; }
        .strong { font-weight: 700; }
        .right { text-align: right; }
        .center { text-align: center; }
        .section { border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 14px; padding: 14px; }
        .grid-2 { width: 100%; }
        .grid-2 td { border: 0; padding: 0; width: 50%; }
        .grid-2 td:first-child { padding-right: 8px; }
        .grid-2 td:last-child { padding-left: 8px; }
        .summary { margin-left: auto; width: 315px; }
        .summary-row { border-bottom: 1px solid #eef2f7; overflow: hidden; padding: 6px 0; }
        .summary-row span:first-child { float: left; color: #4b5563; }
        .summary-row span:last-child { float: right; font-weight: 700; }
        .total-row { border-top: 2px solid #111827; border-bottom: 0; font-size: 14px; margin-top: 4px; padding-top: 9px; }
        .badge { border: 1px solid #d1d5db; border-radius: 999px; display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 7px; text-transform: uppercase; }
        .footer { bottom: -30px; color: #6b7280; font-size: 10px; left: 0; position: fixed; right: 0; text-align: center; }
        .page-number:after { content: counter(page); }
    </style>
</head>
<body>
    @include('pdf.partials.header', ['company' => $company])
    @yield('content')
    @include('pdf.partials.footer', ['company' => $company, 'generatedAt' => $generatedAt ?? now()])
</body>
</html>
