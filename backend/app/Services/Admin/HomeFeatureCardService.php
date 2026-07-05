<?php

namespace App\Services\Admin;

use App\Models\HomeFeatureCard;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HomeFeatureCardService
{
    public function paginate(array $filters): LengthAwarePaginator
    {
        $query = HomeFeatureCard::query();

        if ($search = $filters['search'] ?? null) {
            $query->where(function ($query) use ($search): void {
                $query
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('icon', 'like', "%{$search}%");
            });
        }

        if (array_key_exists('status', $filters) && $filters['status'] !== null && $filters['status'] !== '') {
            $query->where('status', filter_var($filters['status'], FILTER_VALIDATE_BOOLEAN));
        }

        return $query
            ->orderBy($filters['sort'] ?? 'sort_order', $filters['direction'] ?? 'asc')
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? 10);
    }

    public function create(array $data, ?int $userId = null): HomeFeatureCard
    {
        return DB::transaction(function () use ($data, $userId): HomeFeatureCard {
            $card = HomeFeatureCard::query()->create([
                ...$data,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $this->clearRuntimeCaches();
            Log::info('Home feature card created.', ['id' => $card->id, 'user_id' => $userId]);

            return $card->refresh();
        });
    }

    public function find(int $id): HomeFeatureCard
    {
        return HomeFeatureCard::query()->findOrFail($id);
    }

    public function update(int $id, array $data, ?int $userId = null): HomeFeatureCard
    {
        return DB::transaction(function () use ($id, $data, $userId): HomeFeatureCard {
            $card = $this->find($id);
            $card->fill([...$data, 'updated_by' => $userId])->save();

            $this->clearRuntimeCaches();
            Log::info('Home feature card updated.', ['id' => $card->id, 'user_id' => $userId]);

            return $card->refresh();
        });
    }

    public function delete(int $id, ?int $userId = null): void
    {
        $card = $this->find($id);
        $card->delete();

        $this->clearRuntimeCaches();
        Log::info('Home feature card deleted.', ['id' => $id, 'user_id' => $userId]);
    }

    public function reorder(array $cards, ?int $userId = null): Collection
    {
        return DB::transaction(function () use ($cards, $userId): Collection {
            foreach ($cards as $card) {
                HomeFeatureCard::query()
                    ->whereKey($card['id'])
                    ->update([
                        'sort_order' => $card['sort_order'],
                        'updated_by' => $userId,
                        'updated_at' => now(),
                    ]);
            }

            $this->clearRuntimeCaches();
            Log::info('Home feature cards reordered.', ['count' => count($cards), 'user_id' => $userId]);

            return HomeFeatureCard::query()->orderBy('sort_order')->orderBy('id')->get();
        });
    }

    public function activeForRuntime(): array
    {
        return Cache::remember(
            'home-feature-cards.runtime',
            now()->addMinutes(10),
            fn (): array => HomeFeatureCard::query()
                ->active()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'icon', 'title', 'description', 'sort_order'])
                ->map(fn (HomeFeatureCard $card): array => [
                    'id' => $card->id,
                    'icon' => $card->icon,
                    'title' => $card->title,
                    'description' => $card->description,
                    'sort_order' => (int) $card->sort_order,
                ])
                ->all()
        );
    }

    private function clearRuntimeCaches(): void
    {
        Cache::forget('home-feature-cards.runtime');
        Cache::forget('settings.navigation.runtime');
    }
}
