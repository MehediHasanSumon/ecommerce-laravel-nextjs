<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('collections', function (Blueprint $table): void {
            $table->string('collection_type')->default('manual')->index();
            $table->string('rule_key')->nullable()->index();
            $table->json('rules')->nullable();
            $table->boolean('is_system')->default(false)->index();
            $table->boolean('is_featured')->default(false)->index();
            $table->boolean('show_on_home')->default(false)->index();
            $table->unsignedInteger('home_sort_order')->default(100)->index();
            $table->unsignedInteger('product_limit')->default(4);
            $table->unsignedInteger('priority')->default(0)->index();
            $table->string('discount_type')->nullable()->index();
            $table->unsignedInteger('discount_value')->nullable();
            $table->text('banner_image_url')->nullable();
            $table->text('mobile_banner_image_url')->nullable();
            $table->text('logo_url')->nullable();
            $table->string('display_title')->nullable();
            $table->string('subtitle')->nullable();
            $table->string('promotional_text')->nullable();
            $table->string('cta_text')->nullable();
            $table->string('cta_url')->nullable();
            $table->json('route_aliases')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->text('meta_keywords')->nullable();
            $table->string('canonical_url')->nullable();
            $table->string('og_title')->nullable();
            $table->text('og_description')->nullable();
            $table->text('og_image_url')->nullable();
            $table->softDeletes();
        });

        DB::table('collections')->update([
            'collection_type' => DB::raw('type'),
            'product_limit' => 4,
            'updated_at' => now(),
        ]);

        foreach ($this->systemCollections() as $collection) {
            DB::table('collections')->updateOrInsert(
                ['slug' => $collection['slug']],
                array_merge($collection, [
                    'type' => $collection['collection_type'],
                    'status' => 'active',
                    'is_system' => true,
                    'show_on_home' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }

    public function down(): void
    {
        Schema::table('collections', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'collection_type',
                'rule_key',
                'rules',
                'is_system',
                'is_featured',
                'show_on_home',
                'home_sort_order',
                'product_limit',
                'priority',
                'discount_type',
                'discount_value',
                'banner_image_url',
                'mobile_banner_image_url',
                'logo_url',
                'display_title',
                'subtitle',
                'promotional_text',
                'cta_text',
                'cta_url',
                'route_aliases',
                'meta_title',
                'meta_description',
                'meta_keywords',
                'canonical_url',
                'og_title',
                'og_description',
                'og_image_url',
            ]);
        });
    }

    private function systemCollections(): array
    {
        return [
            [
                'name' => 'Flash Sale',
                'slug' => 'flash-sale',
                'collection_type' => 'smart',
                'rule_key' => 'flash_sale',
                'description' => 'Limited-time deals on selected premium products.',
                'display_title' => 'Flash Sale',
                'subtitle' => 'Limited-time deals - grab them before they are gone',
                'promotional_text' => 'FLASH SALE',
                'home_sort_order' => 30,
                'product_limit' => 4,
                'priority' => 100,
                'route_aliases' => json_encode(['/flash-sale']),
                'meta_title' => 'Flash Sale | LuxeCart',
                'meta_description' => 'Shop active flash sale products at LuxeCart.',
            ],
            [
                'name' => 'Trending Now',
                'slug' => 'trending-now',
                'collection_type' => 'smart',
                'rule_key' => 'trending',
                'description' => 'Most wanted products this week.',
                'display_title' => 'Trending Now',
                'subtitle' => 'Most wanted products this week',
                'home_sort_order' => 60,
                'product_limit' => 8,
                'priority' => 40,
                'meta_title' => 'Trending Now | LuxeCart',
                'meta_description' => 'Browse trending products at LuxeCart.',
            ],
            [
                'name' => 'Best Sellers',
                'slug' => 'best-sellers',
                'collection_type' => 'smart',
                'rule_key' => 'best_sellers',
                'description' => 'Our most loved products, backed by customer reviews.',
                'display_title' => 'Best Sellers',
                'subtitle' => 'Our most loved products, backed by thousands of reviews',
                'promotional_text' => 'Best Sellers',
                'home_sort_order' => 70,
                'product_limit' => 4,
                'priority' => 50,
                'route_aliases' => json_encode(['/best-sellers']),
                'meta_title' => 'Best Sellers | LuxeCart',
                'meta_description' => 'Shop bestselling products at LuxeCart.',
            ],
            [
                'name' => 'New Arrivals',
                'slug' => 'new-arrivals',
                'collection_type' => 'smart',
                'rule_key' => 'new_arrivals',
                'description' => 'The freshest products from top brands.',
                'display_title' => 'New Arrivals',
                'subtitle' => 'Fresh off the shelves - first to discover, first to own',
                'promotional_text' => 'New Arrivals',
                'home_sort_order' => 90,
                'product_limit' => 4,
                'priority' => 30,
                'route_aliases' => json_encode(['/new-arrivals']),
                'meta_title' => 'New Arrivals | LuxeCart',
                'meta_description' => 'Browse the latest published products at LuxeCart.',
            ],
        ];
    }
};
