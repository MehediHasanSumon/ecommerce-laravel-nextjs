<?php

namespace App\Services\Fraud;

use App\Models\FraudCheck;
use App\Models\FraudProviderResult;
use App\Models\GuestCustomer;
use App\Models\Order;
use App\Models\User;
use App\Services\Admin\Settings\FraudSettingsService;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class FraudCheckService
{
    public const RISK_LEVELS = ['safe', 'low', 'medium', 'high', 'critical'];

    public function __construct(
        private readonly FraudSettingsService $settings,
        private readonly StoreSettingsService $storeSettings,
        private readonly FraudManager $manager,
        private readonly FraudDecisionService $decisions,
    ) {}

    public function check(
        array $input,
        string $subjectType,
        ?string $subjectKey = null,
        ?Order $order = null,
        ?User $user = null,
        ?GuestCustomer $guest = null,
        string $trigger = 'manual',
        bool $automatic = false,
        ?int $actorId = null,
        bool $bypassCache = false,
    ): FraudCheck {
        $startedAt = hrtime(true);
        $normalized = $this->normalizeInput($input);
        $store = $this->storeSettings->get();
        $priority = (array) ($store->fraud_provider_priority ?? []);
        $providers = $this->settings->enabled($priority);
        if ($providers->isEmpty()) {
            throw ValidationException::withMessages([
                'providers' => ['Enable and configure at least one fraud intelligence provider.'],
            ]);
        }

        $fingerprint = $this->fingerprint($normalized);
        if (! $bypassCache && $store->fraud_result_caching_enabled) {
            $cached = FraudCheck::query()
                ->with('providerResults')
                ->where('input_fingerprint', $fingerprint)
                ->whereIn('status', ['completed', 'partial'])
                ->where('expires_at', '>', now())
                ->latest('checked_at')
                ->first();
            if ($cached) {
                return $this->copyCachedResult(
                    $cached,
                    $normalized,
                    $subjectType,
                    $subjectKey,
                    $order,
                    $user,
                    $guest,
                    $trigger,
                    $automatic,
                    $actorId,
                );
            }
        }

        $check = FraudCheck::query()->create([
            'public_id' => (string) Str::uuid(),
            'order_id' => $order?->id,
            'user_id' => $user?->id,
            'guest_customer_id' => $guest?->id,
            'triggered_by' => $actorId,
            'subject_type' => $subjectType,
            'subject_key' => $subjectKey,
            'input_fingerprint' => $fingerprint,
            'input_payload' => $normalized,
            'trigger' => $trigger,
            'is_automatic' => $automatic,
            'status' => 'pending',
            'providers_requested' => $providers->count(),
        ]);

        $successful = collect();
        $failed = 0;
        foreach ($providers as $setting) {
            try {
                $result = $this->manager->provider($setting->provider)->check($setting, $normalized, $check->id);
                $successful->push($result + ['provider' => $setting->provider]);
                FraudProviderResult::query()->create([
                    'fraud_check_id' => $check->id,
                    'fraud_provider_setting_id' => $setting->id,
                    'provider' => $setting->provider,
                    'status' => 'success',
                    'risk_score' => $result['risk_score'],
                    'risk_level' => $result['risk_level'],
                    'blacklist_status' => $result['blacklist_status'],
                    'fraud_matches' => $result['fraud_matches'],
                    'known_scam_reports' => $result['known_scam_reports'],
                    'chargeback_reports' => $result['chargeback_reports'],
                    'suspicious_activity_count' => $result['suspicious_activity_count'],
                    'risk_reasons' => $result['risk_reasons'],
                    'recommendation' => $result['recommendation'],
                    'response_time_ms' => $result['response_time_ms'],
                    'raw_response' => $result['raw_response'],
                ]);
            } catch (Throwable $exception) {
                $failed++;
                FraudProviderResult::query()->create([
                    'fraud_check_id' => $check->id,
                    'fraud_provider_setting_id' => $setting->id,
                    'provider' => $setting->provider,
                    'status' => 'failed',
                    'risk_score' => 0,
                    'risk_level' => 'safe',
                    'error_message' => Str::limit($exception->getMessage(), 5000, ''),
                ]);
            }
        }

        $aggregate = $this->aggregate($successful);
        $status = match (true) {
            $successful->isEmpty() => 'failed',
            $failed > 0 => 'partial',
            default => 'completed',
        };
        $decision = $this->decisions->evaluate($aggregate['risk_score'], $aggregate['risk_level']);
        $check->forceFill([
            ...$aggregate,
            'status' => $status,
            'is_flagged' => (bool) $decision['flag'],
            'decision' => $decision,
            'providers_succeeded' => $successful->count(),
            'providers_failed' => $failed,
            'response_time_ms' => (int) round((hrtime(true) - $startedAt) / 1_000_000),
            'checked_at' => now(),
            'expires_at' => now()->addMinutes(max(1, (int) $store->fraud_cache_duration_minutes)),
        ])->save();

        $loaded = $this->find($check->public_id);
        if ($order) {
            $this->decisions->applyToOrder($order, $loaded);
        }

        return $loaded;
    }

    public function find(string|int $check): FraudCheck
    {
        return FraudCheck::query()
            ->with([
                'providerResults' => fn ($query) => $query->orderByDesc('risk_score'),
                'actor:id,name,email',
                'order:id,order_number',
                'user:id,name,email,phone',
                'guestCustomer:id,name,email,phone',
            ])
            ->where(fn (Builder $query) => $query->where('id', $check)->orWhere('public_id', $check))
            ->firstOrFail();
    }

    public function history(array $filters): LengthAwarePaginator
    {
        return FraudCheck::query()
            ->with([
                'providerResults:id,fraud_check_id,provider,status,risk_score,risk_level,response_time_ms,error_message',
                'order:id,order_number',
                'user:id,name,email,phone',
                'guestCustomer:id,name,email,phone',
                'actor:id,name',
            ])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $escaped = '%'.addcslashes(trim($search), '\\%_').'%';
                $query->where(fn (Builder $query) => $query
                    ->where('subject_key', 'like', $escaped)
                    ->orWhereHas('order', fn (Builder $order) => $order->where('order_number', 'like', $escaped))
                    ->orWhereHas('user', fn (Builder $user) => $user->where('name', 'like', $escaped)->orWhere('email', 'like', $escaped)->orWhere('phone', 'like', $escaped))
                    ->orWhereHas('guestCustomer', fn (Builder $guest) => $guest->where('name', 'like', $escaped)->orWhere('email', 'like', $escaped)->orWhere('phone', 'like', $escaped)));
            })
            ->when($filters['risk_level'] ?? null, fn (Builder $query, string $level) => $query->where('risk_level', $level))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['provider'] ?? null, fn (Builder $query, string $provider) => $query->whereHas('providerResults', fn (Builder $result) => $result->where('provider', $provider)))
            ->when($filters['trigger'] ?? null, fn (Builder $query, string $trigger) => $query->where('trigger', $trigger))
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('checked_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $date) => $query->whereDate('checked_at', '<=', $date))
            ->latest('checked_at')
            ->paginate(min(max((int) ($filters['per_page'] ?? 20), 1), 100));
    }

    public function clearCache(array $filters = []): int
    {
        return FraudCheck::query()
            ->where('expires_at', '>', now())
            ->when($filters['order_ids'] ?? null, fn (Builder $query, array $ids) => $query->whereIn('order_id', $ids))
            ->when($filters['user_ids'] ?? null, fn (Builder $query, array $ids) => $query->whereIn('user_id', $ids))
            ->when($filters['guest_customer_ids'] ?? null, fn (Builder $query, array $ids) => $query->whereIn('guest_customer_id', $ids))
            ->update(['expires_at' => now()]);
    }

    public function inputForOrder(Order $order): array
    {
        $billing = (array) $order->billing_address;
        $shipping = (array) $order->shipping_address;

        return [
            'phone' => $billing['phone'] ?? $order->user?->phone ?? $order->guestCustomer?->phone,
            'name' => $billing['full_name'] ?? $order->user?->name ?? $order->guestCustomer?->name,
            'email' => $billing['email'] ?? $order->user?->email ?? $order->guestCustomer?->email,
            'ip_address' => $order->client_ip,
            'billing_address' => $billing,
            'shipping_address' => $shipping,
            'order_id' => $order->order_number,
            'customer_id' => $order->user_id ? "registered-{$order->user_id}" : "guest-{$order->guest_customer_id}",
        ];
    }

    private function normalizeInput(array $input): array
    {
        $phone = preg_replace('/\D+/', '', (string) ($input['phone'] ?? ''));
        if (str_starts_with($phone, '880')) {
            $phone = '0'.substr($phone, 3);
        } elseif (strlen($phone) === 10 && str_starts_with($phone, '1')) {
            $phone = '0'.$phone;
        }
        if (! preg_match('/^01[3-9][0-9]{8}$/', $phone)) {
            throw ValidationException::withMessages([
                'phone' => ['Enter a valid Bangladeshi mobile number.'],
            ]);
        }

        return [
            'phone' => $phone,
            'name' => $this->cleanText($input['name'] ?? null, 191),
            'email' => filter_var($input['email'] ?? null, FILTER_VALIDATE_EMAIL) ?: null,
            'ip_address' => filter_var($input['ip_address'] ?? null, FILTER_VALIDATE_IP) ?: null,
            'billing_address' => $this->cleanAddress($input['billing_address'] ?? null),
            'shipping_address' => $this->cleanAddress($input['shipping_address'] ?? null),
            'nid' => $this->cleanText($input['nid'] ?? null, 40),
            'order_id' => $this->cleanText($input['order_id'] ?? null, 191),
            'customer_id' => $this->cleanText($input['customer_id'] ?? null, 191),
        ];
    }

    private function aggregate(Collection $results): array
    {
        if ($results->isEmpty()) {
            return [
                'risk_score' => 0,
                'risk_level' => 'safe',
                'blacklist_status' => null,
                'fraud_matches' => 0,
                'known_scam_reports' => 0,
                'chargeback_reports' => 0,
                'suspicious_activity_count' => 0,
                'risk_reasons' => ['No enabled fraud provider returned a usable result.'],
                'recommendation' => 'Review the provider errors and verify this customer manually.',
            ];
        }

        $score = (int) $results->max('risk_score');
        $blacklistValues = $results->pluck('blacklist_status')->filter(fn ($value) => $value !== null);
        $highest = $results->sortByDesc('risk_score')->first();

        return [
            'risk_score' => $score,
            'risk_level' => $this->riskLevel($score),
            'blacklist_status' => $blacklistValues->isEmpty() ? null : $blacklistValues->contains(true),
            'fraud_matches' => (int) $results->sum('fraud_matches'),
            'known_scam_reports' => (int) $results->sum('known_scam_reports'),
            'chargeback_reports' => (int) $results->sum('chargeback_reports'),
            'suspicious_activity_count' => (int) $results->sum('suspicious_activity_count'),
            'risk_reasons' => $results->pluck('risk_reasons')->flatten()->filter()->unique()->values()->all(),
            'recommendation' => $highest['recommendation'] ?? null,
        ];
    }

    private function copyCachedResult(
        FraudCheck $cached,
        array $input,
        string $subjectType,
        ?string $subjectKey,
        ?Order $order,
        ?User $user,
        ?GuestCustomer $guest,
        string $trigger,
        bool $automatic,
        ?int $actorId,
    ): FraudCheck {
        $copy = DB::transaction(function () use ($cached, $input, $subjectType, $subjectKey, $order, $user, $guest, $trigger, $automatic, $actorId): FraudCheck {
            $copy = FraudCheck::query()->create([
                'public_id' => (string) Str::uuid(),
                'order_id' => $order?->id,
                'user_id' => $user?->id,
                'guest_customer_id' => $guest?->id,
                'triggered_by' => $actorId,
                'cached_from_id' => $cached->id,
                'subject_type' => $subjectType,
                'subject_key' => $subjectKey,
                'input_fingerprint' => $cached->input_fingerprint,
                'input_payload' => $input,
                'trigger' => $trigger,
                'is_automatic' => $automatic,
                'status' => 'cached',
                'risk_score' => $cached->risk_score,
                'risk_level' => $cached->risk_level,
                'is_flagged' => $cached->is_flagged,
                'blacklist_status' => $cached->blacklist_status,
                'fraud_matches' => $cached->fraud_matches,
                'known_scam_reports' => $cached->known_scam_reports,
                'chargeback_reports' => $cached->chargeback_reports,
                'suspicious_activity_count' => $cached->suspicious_activity_count,
                'risk_reasons' => $cached->risk_reasons,
                'recommendation' => $cached->recommendation,
                'decision' => $cached->decision,
                'providers_requested' => $cached->providers_requested,
                'providers_succeeded' => $cached->providers_succeeded,
                'providers_failed' => $cached->providers_failed,
                'response_time_ms' => 0,
                'checked_at' => now(),
                'expires_at' => $cached->expires_at,
            ]);
            foreach ($cached->providerResults as $result) {
                $copy->providerResults()->create($result->only([
                    'fraud_provider_setting_id',
                    'provider',
                    'status',
                    'risk_score',
                    'risk_level',
                    'blacklist_status',
                    'fraud_matches',
                    'known_scam_reports',
                    'chargeback_reports',
                    'suspicious_activity_count',
                    'risk_reasons',
                    'recommendation',
                    'response_time_ms',
                    'raw_response',
                    'error_message',
                ]));
            }

            return $copy;
        }, 3);

        $loaded = $this->find($copy->public_id);
        if ($order) {
            $this->decisions->applyToOrder($order, $loaded);
        }

        return $loaded;
    }

    private function fingerprint(array $input): string
    {
        return hash_hmac('sha256', json_encode([
            $input['phone'],
            $input['email'],
            $input['nid'],
        ], JSON_THROW_ON_ERROR), (string) config('app.key'));
    }

    private function riskLevel(int $score): string
    {
        return match (true) {
            $score >= (int) config('fraud.risk_levels.critical', 85) => 'critical',
            $score >= (int) config('fraud.risk_levels.high', 70) => 'high',
            $score >= (int) config('fraud.risk_levels.medium', 45) => 'medium',
            $score >= (int) config('fraud.risk_levels.low', 20) => 'low',
            default => 'safe',
        };
    }

    private function cleanText(mixed $value, int $limit): ?string
    {
        if (! is_scalar($value) || trim((string) $value) === '') {
            return null;
        }

        return Str::limit(trim(strip_tags((string) $value)), $limit, '');
    }

    private function cleanAddress(mixed $address): ?array
    {
        if (! is_array($address)) {
            return null;
        }

        return collect($address)
            ->only(['full_name', 'phone', 'email', 'country', 'state', 'district', 'city', 'area', 'postal_code', 'address_line'])
            ->map(fn ($value) => $this->cleanText($value, 500))
            ->filter(fn ($value) => $value !== null)
            ->all() ?: null;
    }
}
