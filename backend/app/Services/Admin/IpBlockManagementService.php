<?php

namespace App\Services\Admin;

use App\Models\IpBlock;
use App\Models\User;
use App\Services\Security\IpBlockAuditService;
use App\Services\Security\IpBlockStateService;
use App\Services\Security\SecuritySettingsService;
use App\Support\Security\IpAddress;
use App\Support\Security\UserAgentMetadata;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class IpBlockManagementService
{
    public function __construct(
        private readonly IpBlockAuditService $audit,
        private readonly IpBlockStateService $state,
    ) {}

    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = IpBlock::query()
            ->with(['creator:id,name,email', 'updater:id,name,email'])
            ->when($filters['search'] ?? null, function (Builder $query, string $search): void {
                $normalized = IpAddress::normalize($search);
                $query->where(function (Builder $query) use ($search, $normalized): void {
                    if ($normalized !== null) {
                        $query->orWhere('ip_address', $normalized);
                    } elseif (preg_match('/^[0-9a-fA-F:.]+$/', $search)) {
                        $query->orWhere('ip_address', 'like', $search.'%');
                    }
                    $query->orWhereRaw('LOWER(reason) LIKE ?', ['%'.mb_strtolower($search).'%'])
                        ->orWhereRaw('LOWER(COALESCE(notes, \'\')) LIKE ?', ['%'.mb_strtolower($search).'%']);
                });
            })
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('status', $status))
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('type', $type))
            ->when($filters['reason'] ?? null, fn (Builder $query, string $reason) => $query->where('reason', $reason))
            ->when($filters['country'] ?? null, fn (Builder $query, string $country) => $query->where('country', $country))
            ->when($filters['date_from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('blocked_at', '>=', $date))
            ->when($filters['date_to'] ?? null, fn (Builder $query, string $date) => $query->whereDate('blocked_at', '<=', $date));

        $sort = $filters['sort'] ?? 'blocked_at';
        $direction = $filters['direction'] ?? 'desc';

        return $query
            ->orderBy($sort, $direction)
            ->orderBy('id', $direction)
            ->paginate(min(100, max(10, (int) ($filters['per_page'] ?? 20))));
    }

    public function create(array $data, ?User $actor, ?Request $request = null): IpBlock
    {
        $ip = $this->normalizedIp($data['ip_address']);
        if (IpAddress::isLocal($ip)) {
            throw ValidationException::withMessages(['ip_address' => ['Localhost addresses cannot be blocked.']]);
        }

        $block = DB::transaction(function () use ($data, $actor, $request, $ip): IpBlock {
            $existing = IpBlock::withTrashed()->where('ip_address', $ip)->lockForUpdate()->first();
            if ($existing && ! $existing->trashed()) {
                throw ValidationException::withMessages(['ip_address' => ['This IP address already exists.']]);
            }

            $metadata = UserAgentMetadata::from($request?->userAgent());
            $attributes = [
                ...$this->attributes($data),
                ...$metadata,
                'ip_address' => $ip,
                'ip_version' => IpAddress::version($ip),
                'blocked_at' => now(),
                'last_activity_at' => now(),
                'block_count' => max(1, (int) ($existing?->block_count ?? 0) + 1),
                'created_by' => $actor?->id,
                'updated_by' => $actor?->id,
                'deleted_at' => null,
            ];

            if ($existing) {
                $existing->restore();
                $existing->fill($attributes)->save();
                $block = $existing;
            } else {
                $block = IpBlock::query()->create($attributes);
            }

            $this->audit->record('created', $block, $actor, request: $request);
            if ($block->status === 'active') {
                $this->audit->record('blocked', $block, $actor, request: $request);
            }

            DB::afterCommit(fn () => $this->state->forget($ip));

            return $block;
        });

        return $block->load(['creator:id,name,email', 'updater:id,name,email']);
    }

    public function update(IpBlock $block, array $data, ?User $actor, ?Request $request = null): IpBlock
    {
        $ip = $block->ip_address;

        DB::transaction(function () use ($block, $data, $actor, $request, $ip): void {
            $locked = IpBlock::query()->whereKey($block->id)->lockForUpdate()->firstOrFail();
            $before = $locked->only(['reason', 'status', 'type', 'expires_at', 'notes']);
            $locked->fill([
                ...$this->attributes($data),
                'updated_by' => $actor?->id,
                'last_activity_at' => now(),
                'blocked_at' => ($data['status'] ?? $locked->status) === 'active' && $locked->status !== 'active'
                    ? now()
                    : $locked->blocked_at,
                'block_count' => ($data['status'] ?? $locked->status) === 'active' && $locked->status !== 'active'
                    ? $locked->block_count + 1
                    : $locked->block_count,
            ])->save();

            $event = match (true) {
                $before['status'] !== $locked->status && $locked->status === 'active' => 'blocked',
                $before['status'] !== $locked->status => 'unblocked',
                $before['reason'] !== $locked->reason => 'reason_updated',
                default => 'updated',
            };
            $this->audit->record($event, $locked, $actor, metadata: ['before' => $before], request: $request);
            DB::afterCommit(fn () => $this->state->forget($ip));
        });

        return $block->refresh()->load(['creator:id,name,email', 'updater:id,name,email']);
    }

    public function delete(IpBlock $block, ?User $actor, ?Request $request = null): void
    {
        DB::transaction(function () use ($block, $actor, $request): void {
            $this->audit->record('deleted', $block, $actor, request: $request);
            $block->delete();
            DB::afterCommit(fn () => $this->state->forget($block->ip_address));
        });
    }

    public function bulk(array $ids, string $action, ?User $actor, array $data = [], ?Request $request = null): int
    {
        $count = 0;
        IpBlock::query()->whereIn('id', $ids)->orderBy('id')->chunkById(100, function ($blocks) use (&$count, $action, $actor, $data, $request): void {
            foreach ($blocks as $block) {
                if ($action === 'delete') {
                    $this->delete($block, $actor, $request);
                } else {
                    $status = in_array($action, ['block', 'activate'], true) ? 'active' : 'inactive';
                    $this->update($block, [
                        'reason' => $data['reason'] ?? $block->reason,
                        'status' => $status,
                        'type' => $block->type,
                        'expires_at' => $data['expires_at'] ?? $block->expires_at,
                        'notes' => $block->notes,
                    ], $actor, $request);
                }
                $count++;
            }
        });

        return $count;
    }

    public function deleteExpired(?User $actor, ?Request $request = null): int
    {
        $ids = IpBlock::query()
            ->where(fn (Builder $query) => $query->where('status', 'inactive')->orWhere('expires_at', '<=', now()))
            ->pluck('id')
            ->all();

        return $this->bulk($ids, 'delete', $actor, request: $request);
    }

    public function automaticBlock(string $ip, string $reason, array $metadata = [], ?Request $request = null): ?IpBlock
    {
        $ip = $this->normalizedIp($ip);
        if (IpAddress::isLocal($ip) || $this->state->isWhitelisted($ip)) {
            return null;
        }

        return DB::transaction(function () use ($ip, $reason, $metadata, $request): IpBlock {
            $block = IpBlock::withTrashed()->where('ip_address', $ip)->lockForUpdate()->first();
            $count = (int) ($block?->block_count ?? 0) + 1;
            $threshold = max(1, (int) app(SecuritySettingsService::class)->get()->permanent_block_threshold);
            $agent = UserAgentMetadata::from($request?->userAgent());
            $attributes = [
                'ip_address' => $ip,
                'ip_version' => IpAddress::version($ip),
                'type' => 'automatic',
                'status' => 'active',
                'reason' => mb_substr($reason, 0, 80),
                'notes' => 'Automatically blocked by the configurable security policy.',
                'blocked_at' => now(),
                'expires_at' => $count >= $threshold
                    ? null
                    : now()->addMinutes(app(SecuritySettingsService::class)->get()->temporary_block_duration_minutes),
                'last_activity_at' => now(),
                'block_count' => $count,
                ...$agent,
                'deleted_at' => null,
            ];

            if ($block) {
                if ($block->trashed()) {
                    $block->restore();
                }
                $block->fill($attributes)->save();
            } else {
                $block = IpBlock::query()->create($attributes);
            }

            $this->audit->record('auto_block_triggered', $block, reason: $reason, metadata: $metadata, request: $request);
            DB::afterCommit(fn () => $this->state->forget($ip));

            return $block;
        });
    }

    public function analytics(): array
    {
        $active = fn () => IpBlock::query()->where('status', 'active')
            ->where(fn (Builder $query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()));

        return [
            'blocked_today' => IpBlock::query()->whereDate('blocked_at', today())->count(),
            'blocked_this_week' => IpBlock::query()->whereBetween('blocked_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'blocked_this_month' => IpBlock::query()->whereBetween('blocked_at', [now()->startOfMonth(), now()->endOfMonth()])->count(),
            'currently_blocked' => $active()->count(),
            'automatic_blocks' => IpBlock::query()->where('type', 'automatic')->count(),
            'manual_blocks' => IpBlock::query()->where('type', 'manual')->count(),
            'top_countries' => IpBlock::query()->whereNotNull('country')->select('country', DB::raw('COUNT(*) as total'))->groupBy('country')->orderByDesc('total')->limit(5)->get()->toArray(),
            'top_reasons' => IpBlock::query()->select('reason', DB::raw('COUNT(*) as total'))->groupBy('reason')->orderByDesc('total')->limit(5)->get()->toArray(),
        ];
    }

    private function attributes(array $data): array
    {
        return [
            'type' => $data['type'] ?? 'manual',
            'status' => $data['status'] ?? 'active',
            'reason' => $data['reason'],
            'notes' => $data['notes'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
        ];
    }

    private function normalizedIp(string $value): string
    {
        $ip = IpAddress::normalize($value);
        if ($ip === null) {
            throw ValidationException::withMessages(['ip_address' => ['Enter a valid IPv4 or IPv6 address.']]);
        }

        return $ip;
    }
}
