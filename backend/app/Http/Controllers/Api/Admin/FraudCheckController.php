<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\FraudCheckResource;
use App\Http\Responses\ApiResponse;
use App\Jobs\RunFraudCheck;
use App\Models\GuestCustomer;
use App\Models\Order;
use App\Models\User;
use App\Services\Admin\Settings\FraudSettingsService;
use App\Services\Fraud\FraudCheckService;
use App\Services\Fraud\FraudDecisionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class FraudCheckController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_fraud_check', only: ['index', 'show', 'providerStatus']),
            new Middleware('permission:can_create_fraud_check', only: ['store', 'bulk']),
            new Middleware('permission:can_edit_fraud_check', only: ['clearCache', 'approveOrder']),
        ];
    }

    public function __construct(
        private readonly FraudCheckService $checks,
        private readonly FraudDecisionService $decisions,
        private readonly FraudSettingsService $settings,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->inputRules());
        [$order, $user, $guest, $subjectType, $subjectKey, $baseInput] = $this->resolveSubject($data);
        $check = $this->checks->check(
            array_replace($baseInput, $data),
            $subjectType,
            $subjectKey,
            $order,
            $user,
            $guest,
            'manual',
            false,
            $request->user()?->id,
            (bool) ($data['bypass_cache'] ?? false),
        );

        return ApiResponse::success(
            ['check' => FraudCheckResource::make($check)->resolve()],
            'Fraud check completed.',
            201,
        );
    }

    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subjects' => ['required', 'array', 'min:1', 'max:100'],
            'subjects.*.type' => ['required', Rule::in(['order', 'registered', 'guest'])],
            'subjects.*.id' => ['required'],
            'bypass_cache' => ['nullable', 'boolean'],
        ]);
        foreach ($data['subjects'] as $subject) {
            RunFraudCheck::dispatch(
                $subject['type'],
                (string) $subject['id'],
                'bulk_manual',
                false,
                $request->user()?->id,
                (bool) ($data['bypass_cache'] ?? false),
            )->afterCommit();
        }

        return ApiResponse::success(['queued' => count($data['subjects'])], 'Fraud checks queued.', 202);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'risk_level' => ['nullable', Rule::in(FraudCheckService::RISK_LEVELS)],
            'status' => ['nullable', Rule::in(['pending', 'completed', 'partial', 'failed', 'cached'])],
            'provider' => ['nullable', Rule::in($this->settings->providerKeys())],
            'trigger' => ['nullable', 'string', 'max:60'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $checks = $this->checks->history($filters);

        return ApiResponse::success(
            ['checks' => FraudCheckResource::collection($checks)->resolve()],
            'Fraud history loaded.',
            meta: ['pagination' => [
                'current_page' => $checks->currentPage(),
                'last_page' => $checks->lastPage(),
                'per_page' => $checks->perPage(),
                'total' => $checks->total(),
                'from' => $checks->firstItem(),
                'to' => $checks->lastItem(),
            ]],
        );
    }

    public function show(string $check): JsonResponse
    {
        return ApiResponse::success(['check' => FraudCheckResource::make($this->checks->find($check))->resolve()]);
    }

    public function clearCache(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_ids' => ['nullable', 'array', 'max:100'],
            'order_ids.*' => ['integer', 'exists:orders,id'],
            'user_ids' => ['nullable', 'array', 'max:100'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'guest_customer_ids' => ['nullable', 'array', 'max:100'],
            'guest_customer_ids.*' => ['integer', 'exists:guest_customers,id'],
        ]);

        return ApiResponse::success(['cleared' => $this->checks->clearCache($data)], 'Fraud cache cleared.');
    }

    public function approveOrder(Request $request, string $order): JsonResponse
    {
        $record = Order::query()
            ->with('latestFraudCheck.providerResults')
            ->where(fn ($query) => $query->where('id', $order)->orWhere('order_number', $order))
            ->firstOrFail();
        $approved = $this->decisions->approve($record, (int) $request->user()->id);

        return ApiResponse::success([
            'order' => [
                'id' => (string) $approved->id,
                'order_number' => $approved->order_number,
                'fraud_status' => $approved->fraud_status,
                'fraud_score' => $approved->fraud_score,
                'fraud_hold' => (bool) $approved->fraud_hold,
                'fraud_cod_blocked' => (bool) $approved->fraud_cod_blocked,
                'fraud_approved_at' => optional($approved->fraud_approved_at)->toISOString(),
            ],
        ], 'Fraud hold approved and released.');
    }

    public function providerStatus(): JsonResponse
    {
        return ApiResponse::success([
            'providers' => \App\Http\Resources\Admin\Settings\FraudProviderSettingResource::collection($this->settings->all())->resolve(),
            'metadata' => $this->settings->metadata(),
        ]);
    }

    private function inputRules(): array
    {
        return [
            'phone' => ['nullable', 'string', 'max:40'],
            'name' => ['nullable', 'string', 'max:191'],
            'email' => ['nullable', 'email', 'max:191'],
            'ip_address' => ['nullable', 'ip'],
            'billing_address' => ['nullable', 'array'],
            'shipping_address' => ['nullable', 'array'],
            'nid' => ['nullable', 'string', 'max:40'],
            'order_id' => ['nullable'],
            'customer_id' => ['nullable', 'string', 'max:191'],
            'bypass_cache' => ['nullable', 'boolean'],
        ];
    }

    private function resolveSubject(array $data): array
    {
        if (filled($data['order_id'] ?? null)) {
            $order = Order::query()
                ->with(['user', 'guestCustomer'])
                ->where(fn ($query) => $query->where('id', $data['order_id'])->orWhere('order_number', $data['order_id']))
                ->firstOrFail();

            return [$order, $order->user, $order->guestCustomer, 'order', $order->order_number, $this->checks->inputForOrder($order)];
        }
        if (filled($data['customer_id'] ?? null)) {
            [$type, $id] = array_pad(explode('-', (string) $data['customer_id'], 2), 2, null);
            abort_unless(in_array($type, ['registered', 'guest'], true) && ctype_digit((string) $id), 422, 'Invalid customer identifier.');
            if ($type === 'registered') {
                $user = User::query()->findOrFail((int) $id);

                return [null, $user, null, 'customer', "registered-{$user->id}", [
                    'phone' => $user->phone,
                    'name' => $user->name,
                    'email' => $user->email,
                    'customer_id' => "registered-{$user->id}",
                ]];
            }
            $guest = GuestCustomer::query()->findOrFail((int) $id);

            return [null, null, $guest, 'customer', "guest-{$guest->id}", [
                'phone' => $guest->phone,
                'name' => $guest->name,
                'email' => $guest->email,
                'customer_id' => "guest-{$guest->id}",
            ]];
        }

        return [null, null, null, 'manual', null, []];
    }
}
