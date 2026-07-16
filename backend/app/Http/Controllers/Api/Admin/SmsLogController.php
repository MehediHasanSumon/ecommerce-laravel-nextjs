<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\SmsLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class SmsLogController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:can_view_sms_log')];
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['queued', 'sent', 'failed', 'skipped'])],
            'type' => ['nullable', 'string', 'max:100'],
            'provider' => ['nullable', 'string', 'max:60'],
            'sort' => ['nullable', Rule::in(['recipient', 'type', 'provider', 'status', 'sent_at', 'created_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $logs = SmsLog::query()
            ->with('order:id,order_number')
            ->when($data['search'] ?? null, fn ($query, string $search) => $query->where(function ($nested) use ($search): void {
                $nested->where('recipient', 'like', "%{$search}%")
                    ->orWhere('type', 'like', "%{$search}%")
                    ->orWhere('provider_message_id', 'like', "%{$search}%")
                    ->orWhereHas('order', fn ($order) => $order->where('order_number', 'like', "%{$search}%"));
            }))
            ->when($data['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($data['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
            ->when($data['provider'] ?? null, fn ($query, string $provider) => $query->where('provider', $provider))
            ->orderBy($data['sort'] ?? 'created_at', $data['direction'] ?? 'desc')
            ->paginate((int) ($data['per_page'] ?? 15));

        return ApiResponse::success(['logs' => $logs->getCollection()->map(fn (SmsLog $log) => $this->payload($log))->all()], meta: [
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
                'from' => $logs->firstItem(),
                'to' => $logs->lastItem(),
            ],
        ]);
    }

    public function show(SmsLog $smsLog): JsonResponse
    {
        return ApiResponse::success(['log' => $this->payload($smsLog->load('order:id,order_number'))]);
    }

    private function payload(SmsLog $log): array
    {
        return [
            'id' => $log->public_id,
            'recipient' => $log->recipient,
            'type' => $log->type,
            'related_order' => $log->order?->order_number,
            'provider' => $log->provider,
            'message' => $log->message,
            'status' => $log->status,
            'provider_message_id' => $log->provider_message_id,
            'api_response' => $log->api_response,
            'error_message' => $log->error_message,
            'retry_count' => (int) $log->retry_count,
            'sent_at' => $log->sent_at?->toISOString(),
            'created_at' => $log->created_at?->toISOString(),
        ];
    }
}
