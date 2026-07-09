<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $appName = config('app.name', 'Ecommerce');
        $this->replaceIfTableExists('seo_settings', ['site_title', 'meta_title', 'meta_description', 'og_title', 'og_description', 'twitter_title', 'twitter_description'], $appName);
        $this->replaceIfTableExists('product_seo', ['meta_title', 'meta_description'], $appName);
        $this->replaceIfTableExists('collections', ['meta_title', 'meta_description', 'og_title', 'og_description'], $appName);
        $this->replaceIfTableExists('blog_settings', ['default_meta_title', 'default_meta_description'], $appName);
        $this->replaceIfTableExists('blogs', ['meta_title', 'meta_description'], $appName);
        $this->replaceIfTableExists('content_pages', ['title', 'description', 'meta_title', 'meta_description'], $appName);
    }

    public function down(): void
    {
        //
    }

    private function replaceIfTableExists(string $table, array $columns, string $appName): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        foreach ($columns as $column) {
            if (! Schema::hasColumn($table, $column)) {
                continue;
            }

            DB::table($table)
                ->where($column, 'like', '%LuxeCart%')
                ->update([$column => DB::raw("REPLACE({$column}, 'LuxeCart', ".DB::getPdo()->quote($appName).')')]);
        }
    }
};
