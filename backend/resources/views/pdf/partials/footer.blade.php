<div class="footer">
    <p>{{ $company->invoiceFooter() ?: 'Thank you for your business.' }}</p>
    <p>
        @if ($company->website()) {{ $company->website() }} | @endif
        Generated {{ $generatedAt->format('M d, Y h:i A') }} | Page <span class="page-number"></span>
    </p>
</div>
