<?php

namespace App\Services\Admin\Settings;

use App\Models\Settings\BlogSetting;
use App\Services\Admin\Settings\Concerns\ManagesSingletonSettings;
use App\Support\Admin\SettingsDefaults;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class BlogSettingsService
{
    use ManagesSingletonSettings;

    protected function modelClass(): string
    {
        return BlogSetting::class;
    }

    protected function cacheKey(): string
    {
        return 'settings.blog';
    }

    protected function defaults(): array
    {
        return SettingsDefaults::blog();
    }

    public function runtime(): array
    {
        $settings = $this->get();

        return [
            'enabled' => (bool) $settings->enabled,
            'layout' => $settings->layout,
            'list_options' => [
                'enable_thumbnail' => (bool) $settings->list_enable_thumbnail,
                'show_excerpt' => (bool) $settings->list_show_excerpt,
                'show_author' => (bool) $settings->list_show_author,
                'show_published_date' => (bool) $settings->list_show_published_date,
                'show_reading_time' => (bool) $settings->list_show_reading_time,
            ],
            'show_on_home' => (bool) $settings->show_on_home,
            'home_limit' => (int) $settings->home_limit,
            'allow_comments' => (bool) $settings->allow_comments,
            'enable_related' => (bool) $settings->enable_related,
            'enable_search' => (bool) $settings->enable_search,
            'seo' => [
                'default_meta_title' => $settings->default_meta_title,
                'default_meta_description' => $settings->default_meta_description,
                'open_graph_image' => $settings->open_graph_image,
                'canonical_url' => $settings->canonical_url,
            ],
        ];
    }

    public function update(array $data, ?int $userId = null): Model
    {
        $model = $this->get();
        $model->fill([...$data, 'updated_by' => $userId])->save();
        $this->flushCaches();

        return $this->get();
    }

    public function flushCaches(): void
    {
        Cache::forget($this->cacheKey());
        Cache::forget($this->cacheKey().'.id');
        Cache::forget('settings.navigation.runtime');
        Cache::forget('blogs.home.runtime');
    }
}
