<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Product;
use App\Models\ProductCollection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductMerchandisingSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedCollections();
        $this->seedDiscounts();
        $this->seedProductRelations();
    }

    private function seedCollections(): void
    {
        $collections = [
            [
                'name' => 'New Season Essentials',
                'collection_type' => 'manual',
                'status' => 'active',
                'is_featured' => true,
                'show_on_home' => true,
                'home_sort_order' => 110,
                'product_limit' => 8,
                'display_position_anchor' => 'products',
                'display_position_placement' => 'before',
                'route_aliases' => ['/new-season-essentials'],
            ],
            [
                'name' => 'Work From Home Upgrades',
                'collection_type' => 'manual',
                'status' => 'active',
                'is_featured' => true,
                'show_on_home' => true,
                'home_sort_order' => 120,
                'product_limit' => 8,
                'display_position_anchor' => 'top_brands',
                'display_position_placement' => 'after',
                'route_aliases' => ['/work-from-home'],
            ],
            [
                'name' => 'Creator Studio Picks',
                'collection_type' => 'manual',
                'status' => 'active',
                'is_featured' => false,
                'show_on_home' => true,
                'home_sort_order' => 130,
                'product_limit' => 8,
                'display_position_anchor' => 'products',
                'display_position_placement' => 'after',
                'route_aliases' => ['/creator-studio-picks'],
            ],
            [
                'name' => 'Weekend Travel Kit',
                'collection_type' => 'manual',
                'status' => 'active',
                'is_featured' => false,
                'show_on_home' => false,
                'home_sort_order' => 140,
                'product_limit' => 12,
                'display_position_anchor' => 'products',
                'display_position_placement' => 'before',
                'route_aliases' => ['/weekend-travel-kit'],
            ],
            [
                'name' => 'Flash Sale Favorites',
                'collection_type' => 'smart',
                'rule_key' => 'flash_sale',
                'rules' => ['is_flash_sale' => true, 'status' => 'active'],
                'status' => 'active',
                'is_featured' => true,
                'show_on_home' => true,
                'home_sort_order' => 35,
                'product_limit' => 12,
                'discount_enabled' => true,
                'discount_type' => 'percentage',
                'discount_value' => 15,
                'display_position_anchor' => 'promo_banners',
                'display_position_placement' => 'before',
                'route_aliases' => ['/flash-sale-favorites'],
            ],
            [
                'name' => 'Premium Gift Guide',
                'collection_type' => 'manual',
                'status' => 'active',
                'is_featured' => true,
                'show_on_home' => true,
                'home_sort_order' => 150,
                'product_limit' => 8,
                'display_position_anchor' => 'products',
                'display_position_placement' => 'after',
                'route_aliases' => ['/premium-gift-guide'],
            ],
            [
                'name' => 'Back to School',
                'collection_type' => 'smart',
                'rule_key' => 'back_to_school',
                'rules' => ['tags' => ['Student Favorite'], 'status' => 'active'],
                'status' => 'inactive',
                'is_featured' => false,
                'show_on_home' => false,
                'home_sort_order' => 160,
                'product_limit' => 12,
                'display_position_anchor' => 'products',
                'display_position_placement' => 'before',
                'route_aliases' => ['/back-to-school'],
            ],
            [
                'name' => 'Eco Friendly Finds',
                'collection_type' => 'manual',
                'status' => 'active',
                'is_featured' => false,
                'show_on_home' => true,
                'home_sort_order' => 170,
                'product_limit' => 8,
                'display_position_anchor' => 'products',
                'display_position_placement' => 'after',
                'route_aliases' => ['/eco-friendly-finds'],
            ],
        ];

        foreach ($collections as $index => $data) {
            $slug = Str::slug($data['name']);
            $type = $data['collection_type'];

            $collection = ProductCollection::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    ...$data,
                    'type' => $type,
                    'description' => 'A curated storefront collection for '.$data['name'].'.',
                    'display_title' => $data['name'],
                    'subtitle' => $this->collectionSubtitle($data['name']),
                    'promotional_text' => $data['discount_enabled'] ?? false ? 'Limited time offer' : null,
                    'cta_text' => 'Shop now',
                    'cta_url' => '/collections/'.$slug,
                    'meta_title' => $data['name'].' | LuxeCart',
                    'meta_description' => 'Shop '.$data['name'].' at LuxeCart.',
                    'canonical_url' => 'https://example.com/collections/'.$slug,
                    'og_title' => $data['name'],
                    'og_description' => 'Discover '.$data['name'].' at LuxeCart.',
                    'og_image_url' => 'collections/'.$slug.'/cover.webp',
                    'starts_at' => now()->subDays(15),
                    'ends_at' => $index % 3 === 0 ? now()->addDays(45) : null,
                ]
            );

            $products = Product::query()
                ->where('status', 'active')
                ->inRandomOrder()
                ->limit(18)
                ->pluck('id')
                ->values();

            $collection->products()->sync(
                $products->mapWithKeys(fn ($id, $sort) => [$id => ['sort_order' => $sort]])->all()
            );
        }
    }

    private function seedDiscounts(): void
    {
        $discounts = [
            [
                'name' => 'Summer Savings',
                'code' => 'SUMMER15',
                'type' => 'percentage',
                'value' => 15,
                'minimum_order_amount' => 5000,
                'maximum_discount' => 12000,
                'usage_per_customer' => 3,
                'first_order_only' => false,
                'free_shipping' => false,
                'stackable' => false,
                'applicable_scope' => 'all',
            ],
            [
                'name' => 'First Order Credit',
                'code' => 'WELCOME10',
                'type' => 'fixed',
                'value' => 1000,
                'minimum_order_amount' => 5000,
                'maximum_discount' => null,
                'usage_per_customer' => 1,
                'first_order_only' => true,
                'free_shipping' => true,
                'stackable' => false,
                'applicable_scope' => 'all',
            ],
            [
                'name' => 'Audio Week',
                'code' => 'AUDIO20',
                'type' => 'percentage',
                'value' => 20,
                'minimum_order_amount' => 3000,
                'maximum_discount' => 8000,
                'usage_per_customer' => 2,
                'first_order_only' => false,
                'free_shipping' => false,
                'stackable' => false,
                'applicable_scope' => 'categories',
                'categories' => ['Electronics Audio'],
                'brands' => ['Auralux Audio'],
            ],
            [
                'name' => 'Home Refresh',
                'code' => 'HOME25',
                'type' => 'percentage',
                'value' => 25,
                'minimum_order_amount' => 10000,
                'maximum_discount' => 15000,
                'usage_per_customer' => 2,
                'first_order_only' => false,
                'free_shipping' => false,
                'stackable' => false,
                'applicable_scope' => 'categories',
                'categories' => ['Home & Living Furniture', 'Home & Living Kitchen', 'Home & Living Decoration'],
            ],
            [
                'name' => 'Clearance Markdown',
                'code' => null,
                'type' => 'percentage',
                'value' => 30,
                'minimum_order_amount' => null,
                'maximum_discount' => null,
                'usage_per_customer' => null,
                'first_order_only' => false,
                'free_shipping' => false,
                'stackable' => true,
                'applicable_scope' => 'products',
            ],
            [
                'name' => 'Creator Bundle',
                'code' => 'CREATE50',
                'type' => 'fixed',
                'value' => 5000,
                'minimum_order_amount' => 25000,
                'maximum_discount' => null,
                'usage_per_customer' => 2,
                'first_order_only' => false,
                'free_shipping' => true,
                'stackable' => false,
                'applicable_scope' => 'brands',
                'brands' => ['StudioBloom', 'NexaTech', 'PixelForge'],
                'excluded_categories' => ['Books & Media Stationery'],
            ],
        ];

        foreach ($discounts as $index => $data) {
            $products = Product::query()->where('status', 'active')->inRandomOrder()->limit(24)->pluck('id')->all();
            $categoryIds = $this->categoryIds($data['categories'] ?? []);
            $brandIds = $this->brandIds($data['brands'] ?? []);
            $excludedCategoryIds = $this->categoryIds($data['excluded_categories'] ?? []);
            $excludedProductIds = $index === 0
                ? Product::query()->where('status', 'active')->inRandomOrder()->limit(3)->pluck('id')->all()
                : [];

            $discount = Discount::query()->updateOrCreate(
                ['name' => $data['name']],
                [
                    ...collect($data)->except(['products', 'categories', 'brands', 'excluded_products', 'excluded_categories'])->all(),
                    'starts_at' => now()->subDays(7),
                    'ends_at' => now()->addDays(30 + $index * 5),
                    'status' => $index === 4 ? 'inactive' : 'active',
                    'usage_limit' => 500 + ($index * 100),
                    'total_used' => 0,
                ]
            );

            $discount->products()->sync($data['applicable_scope'] === 'products' ? $products : []);
            $discount->categories()->sync($categoryIds);
            $discount->brands()->sync($brandIds);
            $discount->excludedProducts()->sync($excludedProductIds);
            $discount->excludedCategories()->sync($excludedCategoryIds);
        }
    }

    private function seedProductRelations(): void
    {
        DB::table('product_relations')->delete();
        $products = Product::query()->where('status', 'active')->get(['id', 'category_id', 'brand_id']);

        foreach ($products as $product) {
            foreach (['related', 'cross_sell', 'up_sell'] as $type) {
                $candidates = Product::query()
                    ->where('id', '!=', $product->id)
                    ->when($type === 'related', fn ($query) => $query->where('category_id', $product->category_id))
                    ->when($type === 'up_sell', fn ($query) => $query->where('brand_id', $product->brand_id)->whereColumn('base_price_cents', '>', 'cost_price_cents'))
                    ->where('status', 'active')
                    ->inRandomOrder()
                    ->limit(4)
                    ->pluck('id');

                foreach ($candidates as $sort => $relatedId) {
                    DB::table('product_relations')->updateOrInsert(
                        ['product_id' => $product->id, 'related_product_id' => $relatedId, 'type' => $type],
                        ['sort_order' => $sort, 'created_at' => now(), 'updated_at' => now()]
                    );
                }
            }
        }
    }

    private function collectionSubtitle(string $name): string
    {
        return match ($name) {
            'New Season Essentials' => 'Fresh picks for the months ahead',
            'Work From Home Upgrades' => 'Comfortable gear for focused workdays',
            'Creator Studio Picks' => 'Tools and supplies for sharper output',
            'Weekend Travel Kit' => 'Compact favorites for short trips',
            'Flash Sale Favorites' => 'Limited-time products with active markdowns',
            'Premium Gift Guide' => 'Polished picks for memorable gifting',
            'Back to School' => 'Student-ready essentials for a new term',
            'Eco Friendly Finds' => 'Lower-impact options from trusted brands',
            default => 'Curated products from LuxeCart',
        };
    }

    private function categoryIds(array $names): array
    {
        return collect($names)
            ->map(fn (string $name) => Category::query()->where('slug', Str::slug($name))->value('id'))
            ->filter()
            ->values()
            ->all();
    }

    private function brandIds(array $names): array
    {
        return collect($names)
            ->map(fn (string $name) => Brand::query()->where('name', $name)->value('id'))
            ->filter()
            ->values()
            ->all();
    }
}
