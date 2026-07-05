<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductFeature;
use App\Models\ProductImage;
use App\Models\ProductSeo;
use App\Models\ProductSpecification;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\Tag;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductCatalogSeeder extends Seeder
{
    private const TARGET_PRODUCTS = 240;

    private Collection $brands;
    private Collection $categories;
    private Collection $tags;
    private Collection $warehouses;
    private Collection $attributeValues;
    private array $attributeIdsByName = [];

    public function run(): void
    {
        $this->loadReferences();
        $this->seedCuratedProducts();
        $this->seedGeneratedProducts();
    }

    private function loadReferences(): void
    {
        $this->brands = Brand::query()->where('status', 'active')->get();
        $this->categories = Category::query()->whereNotNull('parent_id')->where('status', 'active')->get();
        $this->tags = Tag::query()->get();
        $this->warehouses = Warehouse::query()->where('status', 'active')->get();
        $this->attributeValues = ProductAttributeValue::query()->with('attribute')->get();
        $this->attributeIdsByName = ProductAttribute::query()->pluck('id', 'name')->all();
    }

    private function seedCuratedProducts(): void
    {
        $products = [
            [
                'name' => 'UrbanThread Essential Cotton T-Shirt',
                'category' => 'Fashion Men',
                'brand' => 'UrbanThread',
                'price' => 2900,
                'cost' => 1150,
                'variant_attributes' => ['Color' => ['Red', 'Blue', 'Black'], 'Size' => ['S', 'M', 'L']],
                'tags' => ['Best Seller', 'Lightweight', 'Free Shipping'],
            ],
            [
                'name' => 'NexaTech Nova 14 Pro Laptop',
                'category' => 'Electronics Laptops',
                'brand' => 'NexaTech',
                'price' => 129900,
                'cost' => 95000,
                'variant_attributes' => ['RAM' => ['16GB', '32GB'], 'Storage' => ['512GB', '1TB']],
                'tags' => ['Creator Gear', 'Professional', 'Online Exclusive'],
            ],
            [
                'name' => 'Auralux QuietWave Wireless Headphones',
                'category' => 'Electronics Audio',
                'brand' => 'Auralux Audio',
                'price' => 18900,
                'cost' => 8700,
                'variant_attributes' => ['Color' => ['Black', 'White', 'Navy']],
                'tags' => ['Noise Cancelling', 'Wireless', 'Travel Ready'],
            ],
            [
                'name' => 'CloudDesk Ergonomic Task Chair',
                'category' => 'Home & Living Furniture',
                'brand' => 'CloudDesk',
                'price' => 34900,
                'cost' => 18000,
                'variant_attributes' => ['Color' => ['Black', 'Gray'], 'Material' => ['Leather', 'Polyester']],
                'tags' => ['Work From Home', 'Ergonomic', 'Premium'],
            ],
            [
                'name' => 'StudioBloom Digital Product Photography Course',
                'category' => 'Books & Media Digital Downloads',
                'brand' => 'StudioBloom',
                'price' => 7900,
                'cost' => 1200,
                'product_type' => 'digital',
                'track_inventory' => false,
                'variant_attributes' => ['Subscription Length' => ['Monthly', 'Annual']],
                'tags' => ['Digital Download', 'Creator Gear', 'Beginner Friendly'],
            ],
        ];

        foreach ($products as $index => $config) {
            $product = $this->upsertProduct($config, $index, true);
            $this->syncProductDetails($product, $config, true);
        }
    }

    private function seedGeneratedProducts(): void
    {
        $templates = [
            ['prefix' => 'Aurora', 'category' => 'Electronics Mobile Phones', 'brand' => 'NexaTech', 'attributes' => ['Color' => ['Black', 'White'], 'Storage' => ['128GB', '256GB']]],
            ['prefix' => 'Summit', 'category' => 'Sports & Outdoors Camping', 'brand' => 'EverTrail', 'attributes' => ['Color' => ['Green', 'Gray'], 'Capacity' => ['1L', '2L']]],
            ['prefix' => 'Metro', 'category' => 'Fashion Shoes', 'brand' => 'StrideWorks', 'attributes' => ['Color' => ['Black', 'White'], 'Shoe Size' => ['8', '9', '10', '11']]],
            ['prefix' => 'Hearth', 'category' => 'Home & Living Kitchen', 'brand' => 'TerraCook', 'attributes' => ['Material' => ['Stainless Steel', 'Ceramic'], 'Capacity' => ['500ml', '1L']]],
            ['prefix' => 'Glow', 'category' => 'Beauty & Personal Care Skincare', 'brand' => 'BrightNest', 'attributes' => ['Scent' => ['Unscented', 'Citrus Bloom']]],
            ['prefix' => 'Focus', 'category' => 'Office & Tech Desk Setup', 'brand' => 'CloudDesk', 'attributes' => ['Finish' => ['Matte', 'Natural']]],
            ['prefix' => 'Playwise', 'category' => 'Toys & Kids Learning Toys', 'brand' => 'Horizon Kids', 'attributes' => ['Age Group' => ['Toddler', 'Kids']]],
            ['prefix' => 'Roast', 'category' => 'Grocery & Gourmet Coffee', 'brand' => 'PureSip', 'attributes' => ['Flavor' => ['Vanilla', 'Hazelnut', 'Chocolate']]],
        ];

        $existing = Product::query()->where('sku', 'like', 'LC-%')->count();
        for ($index = $existing; $index < self::TARGET_PRODUCTS; $index++) {
            $template = $templates[$index % count($templates)];
            $name = $template['prefix'].' '.fake()->unique()->words(fake()->numberBetween(2, 4), true);
            $config = [
                'name' => Str::title($name),
                'category' => $template['category'],
                'brand' => $template['brand'],
                'price' => fake()->numberBetween(1800, 149900),
                'cost' => fake()->numberBetween(700, 90000),
                'variant_attributes' => $index % 3 === 0 ? $template['attributes'] : [],
                'tags' => $this->tags->random(fake()->numberBetween(2, 5))->pluck('name')->all(),
                'product_type' => $index % 20 === 0 ? 'digital' : 'physical',
                'track_inventory' => $index % 20 !== 0,
            ];

            $product = $this->upsertProduct($config, $index, false);
            $this->syncProductDetails($product, $config, false);
        }
    }

    private function upsertProduct(array $config, int $index, bool $curated): Product
    {
        $slug = Str::slug($config['name']);
        $brand = $this->brands->firstWhere('name', $config['brand']) ?? $this->brands->random();
        $category = $this->categories->firstWhere('slug', Str::slug($config['category'])) ?? $this->categories->random();
        $price = (int) $config['price'];
        $salePrice = $index % 4 === 0 ? max(500, $price - fake()->numberBetween(300, 5000)) : null;
        $stock = ($config['track_inventory'] ?? true) ? fake()->numberBetween(12, 240) : null;
        $status = $index % 19 === 0 ? 'draft' : ($index % 37 === 0 ? 'archived' : 'active');

        return Product::query()->updateOrCreate(
            ['slug' => $slug],
            [
                'brand_id' => $brand->id,
                'category_id' => $category->id,
                'name' => $config['name'],
                'short_description' => $this->shortDescription($config['name']),
                'description' => $this->longDescription($config['name'], $category->name),
                'product_type' => $config['product_type'] ?? 'physical',
                'status' => $status,
                'sku' => 'LC-'.strtoupper(Str::slug($slug, '')).'-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                'base_price_cents' => $price,
                'compare_at_price_cents' => $salePrice ? $price : null,
                'cost_price_cents' => min((int) $config['cost'], $price),
                'currency' => 'USD',
                'track_inventory' => (bool) ($config['track_inventory'] ?? true),
                'stock_quantity' => $stock,
                'low_stock_threshold' => $stock ? fake()->numberBetween(5, 15) : null,
                'is_featured' => $curated || $index % 11 === 0,
                'is_new' => $index % 7 === 0,
                'is_best_seller' => $curated || $index % 13 === 0,
                'is_flash_sale' => $salePrice !== null,
                'flash_sale_ends_at' => $salePrice ? now()->addDays(fake()->numberBetween(3, 21)) : null,
                'free_shipping' => $price > 5000 || $index % 5 === 0,
                'published_at' => $status === 'active' ? now()->subDays(fake()->numberBetween(1, 120)) : null,
            ]
        );
    }

    private function syncProductDetails(Product $product, array $config, bool $curated): void
    {
        $tagIds = collect($config['tags'] ?? [])->map(fn ($tag) => $this->tags->firstWhere('name', $tag)?->id)->filter()->values();
        if ($tagIds->isEmpty()) {
            $tagIds = $this->tags->random(3)->pluck('id');
        }
        $product->tags()->sync($tagIds->all());

        ProductImage::query()->where('product_id', $product->id)->delete();
        $imageBase = 'products/'.$product->slug;
        ProductImage::query()->create([
            'product_id' => $product->id,
            'url' => "{$imageBase}/featured.webp",
            'alt_text' => $product->name.' featured image',
            'type' => 'featured',
            'sort_order' => 0,
            'is_primary' => true,
        ]);
        for ($i = 1; $i <= 3; $i++) {
            ProductImage::query()->create([
                'product_id' => $product->id,
                'url' => "{$imageBase}/gallery-{$i}.webp",
                'alt_text' => "{$product->name} gallery image {$i}",
                'type' => 'gallery',
                'sort_order' => $i,
                'is_primary' => false,
            ]);
        }

        ProductFeature::query()->where('product_id', $product->id)->delete();
        foreach ($this->featuresFor($product) as $sort => $feature) {
            ProductFeature::query()->create(['product_id' => $product->id, 'value' => $feature, 'sort_order' => $sort]);
        }

        ProductSpecification::query()->where('product_id', $product->id)->delete();
        foreach ($this->specificationsFor($product) as $sort => $specification) {
            ProductSpecification::query()->create(['product_id' => $product->id, ...$specification, 'sort_order' => $sort]);
        }

        ProductSeo::query()->updateOrCreate(
            ['product_id' => $product->id],
            [
                'meta_title' => $product->name.' | LuxeCart',
                'meta_description' => $product->short_description,
                'canonical_url' => 'https://example.com/products/'.$product->slug,
                'og_image_url' => "{$imageBase}/featured.webp",
                'schema_json' => [
                    '@type' => 'Product',
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'brand' => $product->brand?->name,
                    'offers' => ['priceCurrency' => $product->currency, 'price' => $product->base_price_cents / 100],
                ],
            ]
        );

        $this->syncAttributesAndVariants($product, $config);
        $this->syncInventory($product);
    }

    private function syncAttributesAndVariants(Product $product, array $config): void
    {
        DB::table('product_attribute_value')->where('product_id', $product->id)->delete();
        ProductVariant::withTrashed()->where('product_id', $product->id)->forceDelete();

        $variantAttributes = $config['variant_attributes'] ?? [];
        if ($variantAttributes === []) {
            $values = $this->attributeValues->random(fake()->numberBetween(2, 5));
            foreach ($values as $value) {
                DB::table('product_attribute_value')->updateOrInsert(
                    ['product_id' => $product->id, 'attribute_id' => $value->attribute_id, 'attribute_value_id' => $value->id],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
            return;
        }

        $groups = [];
        foreach ($variantAttributes as $attributeName => $valueNames) {
            $groups[$attributeName] = collect($valueNames)->map(fn ($valueName) => $this->findAttributeValue($attributeName, $valueName))->filter()->values();
            foreach ($groups[$attributeName] as $value) {
                DB::table('product_attribute_value')->updateOrInsert(
                    ['product_id' => $product->id, 'attribute_id' => $value->attribute_id, 'attribute_value_id' => $value->id],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }

        foreach ($this->cartesian($groups) as $index => $combination) {
            $suffix = collect($combination)->pluck('slug')->map(fn ($slug) => strtoupper(Str::substr((string) $slug, 0, 4)))->implode('-');
            $variant = ProductVariant::query()->create([
                'product_id' => $product->id,
                'sku' => $product->sku.'-'.$suffix,
                'barcode' => '8'.fake()->unique()->numerify('############'),
                'price_cents' => $product->base_price_cents + ($index * 100),
                'compare_at_price_cents' => $product->compare_at_price_cents,
                'cost_price_cents' => $product->cost_price_cents,
                'stock_quantity' => fake()->numberBetween(8, 80),
                'low_stock_threshold' => fake()->numberBetween(3, 10),
                'weight_grams' => fake()->numberBetween(120, 2800),
                'status' => 'active',
            ]);

            foreach ($combination as $value) {
                DB::table('product_variant_attribute_value')->updateOrInsert(
                    ['product_variant_id' => $variant->id, 'attribute_id' => $value->attribute_id],
                    ['attribute_value_id' => $value->id, 'created_at' => now(), 'updated_at' => now()]
                );
            }

            ProductImage::query()->create([
                'product_id' => $product->id,
                'product_variant_id' => $variant->id,
                'url' => 'variants/'.$product->slug.'/variant-'.($index + 1).'.webp',
                'alt_text' => $product->name.' variant '.($index + 1),
                'type' => 'variant',
                'sort_order' => $index,
                'is_primary' => false,
            ]);
        }
    }

    private function syncInventory(Product $product): void
    {
        Inventory::query()->where('product_id', $product->id)->delete();
        StockMovement::query()->where('product_id', $product->id)->delete();

        $userId = User::query()->value('id');
        $variants = ProductVariant::query()->where('product_id', $product->id)->get();
        $targets = $variants->isNotEmpty() ? $variants : collect([null]);

        foreach ($targets as $target) {
            foreach ($this->warehouses as $warehouse) {
                $quantity = $target ? fake()->numberBetween(5, 120) : (int) ($product->stock_quantity ?? fake()->numberBetween(5, 120));
                $reserved = fake()->numberBetween(0, min(8, $quantity));
                Inventory::query()->create([
                    'product_id' => $product->id,
                    'product_variant_id' => $target?->id,
                    'warehouse_id' => $warehouse->id,
                    'quantity_on_hand' => $quantity,
                    'quantity_reserved' => $reserved,
                    'quantity_available' => $quantity - $reserved,
                    'reorder_level' => $target?->low_stock_threshold ?? $product->low_stock_threshold ?? 5,
                ]);

                foreach (['initial', 'adjustment'] as $movementIndex => $type) {
                    StockMovement::query()->create([
                        'product_id' => $product->id,
                        'product_variant_id' => $target?->id,
                        'warehouse_id' => $warehouse->id,
                        'created_by' => $userId,
                        'type' => $type,
                        'quantity' => $movementIndex === 0 ? $quantity : fake()->numberBetween(-3, 8),
                        'reference_type' => 'seed',
                        'reference_id' => $product->id,
                        'note' => $movementIndex === 0 ? 'Opening inventory balance.' : 'Seeded stock reconciliation adjustment.',
                        'created_at' => now()->subDays(fake()->numberBetween(1, 90)),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    private function findAttributeValue(string $attributeName, string $valueName): ?ProductAttributeValue
    {
        return $this->attributeValues
            ->where('attribute_id', $this->attributeIdsByName[$attributeName] ?? 0)
            ->firstWhere('value', $valueName);
    }

    private function cartesian(array $groups): array
    {
        $result = [[]];
        foreach ($groups as $values) {
            $append = [];
            foreach ($result as $product) {
                foreach ($values as $value) {
                    $append[] = [...$product, $value];
                }
            }
            $result = $append;
        }
        return $result;
    }

    private function featuresFor(Product $product): array
    {
        return [
            'Designed for reliable everyday use with premium quality control.',
            'Ships with clear setup guidance and responsive customer support.',
            $product->free_shipping ? 'Eligible for free standard shipping.' : 'Ships from the nearest available fulfillment center.',
            $product->product_type === 'digital' ? 'Instant digital delivery after checkout.' : 'Packed securely for safe transit.',
        ];
    }

    private function specificationsFor(Product $product): array
    {
        $weight = $product->product_type === 'digital' ? 0 : fake()->numberBetween(120, 6500);

        return [
            ['group_name' => 'Shipping', 'name' => 'Weight', 'value' => $weight.' g'],
            ['group_name' => 'Shipping', 'name' => 'Dimensions', 'value' => fake()->numberBetween(8, 80).' x '.fake()->numberBetween(8, 60).' x '.fake()->numberBetween(2, 40).' cm'],
            ['group_name' => 'Shipping', 'name' => 'Shipping Class', 'value' => $product->product_type === 'digital' ? 'Digital delivery' : fake()->randomElement(['Standard', 'Fragile', 'Oversized'])],
            ['group_name' => 'Package', 'name' => 'Package Information', 'value' => $product->product_type === 'digital' ? 'Delivered through customer account library.' : 'Retail box with recyclable protective packaging.'],
            ['group_name' => 'Warranty', 'name' => 'Warranty', 'value' => fake()->randomElement(['6 Months', '1 Year', '2 Years'])],
        ];
    }

    private function shortDescription(string $name): string
    {
        return "{$name} combines practical design, dependable materials, and polished details for daily use.";
    }

    private function longDescription(string $name, string $category): string
    {
        return "{$name} is built for shoppers who want a dependable {$category} option without guesswork. The product includes thoughtful finishing, clear specifications, and fulfillment-ready packaging so teams can demonstrate catalog, inventory, SEO, media, and variant workflows with realistic data.";
    }
}
