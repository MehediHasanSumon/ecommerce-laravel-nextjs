<?php

namespace App\Services\Admin\Settings\Concerns;

use App\Services\Admin\AdminNavigationService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

trait ManagesSingletonSettings
{
    abstract protected function modelClass(): string;

    abstract protected function defaults(): array;

    abstract protected function cacheKey(): string;

    public function get(): Model
    {
        $class = $this->modelClass();
        $cacheKey = $this->cacheKey().'.id';
        $id = Cache::rememberForever($cacheKey, fn () => $class::query()->firstOrCreate([], $this->defaults())->getKey());

        return $class::query()->find($id) ?? tap(
            $class::query()->firstOrCreate([], $this->defaults()),
            fn (Model $model) => Cache::forever($cacheKey, $model->getKey())
        );
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $model = $this->get();
        $model->fill([...$data, 'updated_by' => $userId])->save();
        Cache::forget($this->cacheKey());
        Cache::forget($this->cacheKey().'.id');
        Cache::forget('navigation.public.runtime');
        app(AdminNavigationService::class)->invalidate();

        return $this->get();
    }
}
