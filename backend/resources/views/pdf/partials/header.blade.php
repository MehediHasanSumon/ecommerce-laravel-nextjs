<div style="border-bottom: 2px solid #111827; margin-bottom: 18px; padding-bottom: 12px;">
    <table style="width: 100%;">
        <tr>
            <td style="border: 0; padding: 0; width: 120px; vertical-align: middle;">
                @if ($company->logoPath())
                    <img src="{{ $company->logoPath() }}" alt="{{ $company->name() }}" style="max-height: 70px; max-width: 110px;">
                @endif
            </td>
            <td style="border: 0; padding: 0; vertical-align: middle;">
                <h1>{{ $company->name() }}</h1>
                @if ($company->address())
                    <p class="muted">{{ $company->address() }}</p>
                @endif
                <p class="muted">
                    @if ($company->phone()) {{ $company->phone() }} @endif
                    @if ($company->phone() && $company->email()) | @endif
                    @if ($company->email()) {{ $company->email() }} @endif
                </p>
            </td>
        </tr>
    </table>
</div>
