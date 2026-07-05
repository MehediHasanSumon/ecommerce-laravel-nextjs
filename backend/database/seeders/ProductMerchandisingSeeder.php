<?php

namespace Database\Seeders;

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
            ['name' => 'New Season Essentials', 'type' => 'manual', 'status' => 'active'],
            ['name' => 'Work From Home Upgrades', 'type' => 'manual', 'status' => 'active'],
            ['name' => 'Creator Studio Picks', 'type' => 'manual', 'status' => 'active'],
            ['name' => 'Weekend Travel Kit', 'type' => 'manual', 'status' => 'active'],
            ['name' => 'Flash Sale Favorites', 'type' => 'automatic', 'status' => 'active'],
            ['name' => 'Premium Gift Guide', 'type' => 'manual', 'status' => 'active'],
            ['name' => 'Back to School', 'type' => 'automatic', 'status' => 'inactive'],
            ['name' => 'Eco Friendly Finds', 'type' => 'manual', 'status' => 'active'],
        ];

        foreach ($collections as $index => $data) {
            $collection = ProductCollection::query()->updateOrCreate(
                ['slug' => Str::slug($data['name'])],
                [
                    ...$data,
                    'description' => 'A curated storefront collection for '.$data['name'].'.',
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
            ['name' => 'Summer Savings', 'code' => 'SUMMER15', 'type' => 'percentage', 'value' => 15],
            ['name' => 'First Order Credit', 'code' => 'WELCOME10', 'type' => 'fixed', 'value' => 1000],
            ['name' => 'Audio Week', 'code' => 'AUDIO20', 'type' => 'percentage', 'value' => 20],
            ['name' => 'Home Refresh', 'code' => 'HOME25', 'type' => 'percentage', 'value' => 25],
            ['name' => 'Clearance Markdown', 'code' => null, 'type' => 'percentage', 'value' => 30],
            ['name' => 'Creator Bundle', 'code' => 'CREATE50', 'type' => 'fixed', 'value' => 5000],
        ];

        foreach ($discounts as $index => $data) {
            $discount = Discount::query()->updateOrCreate(
                ['name' => $data['name']],
                [
                    ...$data,
                    'starts_at' => now()->subDays(7),
                    'ends_at' => now()->addDays(30 + $index * 5),
                    'status' => $index === 4 ? 'inactive' : 'active',
                    'usage_limit' => 500 + ($index * 100),
                ]
            );

            $discount->products()->sync(Product::query()->where('status', 'active')->inRandomOrder()->limit(24)->pluck('id')->all());

            DB::table('discount_category')->where('discount_id', $discount->id)->delete();
            foreach (Category::query()->whereNotNull('parent_id')->inRandomOrder()->limit(6)->pluck('id') as $categoryId) {
                DB::table('discount_category')->insert([
                    'discount_id' => $discount->id,
                    'category_id' => $categoryId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
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
}
