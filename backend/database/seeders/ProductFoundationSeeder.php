<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\Tag;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductFoundationSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedBrands();
        $this->seedCategoryTree();
        $this->seedWarehouses();
        $this->seedAttributes();
        $this->seedTags();
    }

    private function seedBrands(): void
    {
        $brands = [
            'Auralux Audio', 'Northstar Gear', 'UrbanThread', 'HomeHaven', 'PixelForge',
            'StrideWorks', 'Lumina Living', 'Nomad Nest', 'TerraCook', 'Slate & Stitch',
            'VeroFit', 'CloudDesk', 'Oak & Ember', 'FreshFold', 'ModeHaus',
            'BrightNest', 'CoreCharge', 'EverTrail', 'PureSip', 'NexaTech',
            'Bamboo Bay', 'CopperCraft', 'Horizon Kids', 'StudioBloom', 'PrimePack',
        ];

        foreach ($brands as $index => $name) {
            Brand::query()->updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'description' => "{$name} creates dependable products for modern homes, workspaces, and everyday routines.",
                    'logo_url' => 'brands/'.Str::slug($name).'/logo.webp',
                    'cover_image_url' => 'brands/'.Str::slug($name).'/cover.webp',
                    'website_url' => 'https://example.com/brands/'.Str::slug($name),
                    'is_featured' => $index < 8,
                    'status' => 'active',
                ]
            );
        }
    }

    private function seedCategoryTree(): void
    {
        $tree = [
            'Electronics' => ['Mobile Phones', 'Laptops', 'Audio', 'Cameras', 'Smart Home', 'Accessories'],
            'Fashion' => ['Men', 'Women', 'Shoes', 'Bags', 'Watches', 'Activewear'],
            'Home & Living' => ['Furniture', 'Kitchen', 'Decoration', 'Bedding', 'Lighting', 'Storage'],
            'Beauty & Personal Care' => ['Skincare', 'Hair Care', 'Fragrance', 'Grooming', 'Wellness'],
            'Sports & Outdoors' => ['Fitness', 'Cycling', 'Camping', 'Team Sports', 'Yoga'],
            'Toys & Kids' => ['Learning Toys', 'Baby Gear', 'Outdoor Play', 'Kids Clothing', 'School Supplies'],
            'Books & Media' => ['Business Books', 'Design Books', 'Digital Downloads', 'Stationery'],
            'Grocery & Gourmet' => ['Coffee', 'Tea', 'Pantry Staples', 'Snacks', 'Organic'],
            'Automotive' => ['Car Care', 'Travel Accessories', 'Tools', 'Motorcycle Gear'],
            'Office & Tech' => ['Desk Setup', 'Printers', 'Monitors', 'Networking', 'Software'],
        ];

        $sort = 0;
        foreach ($tree as $parentName => $children) {
            $parent = Category::query()->updateOrCreate(
                ['slug' => Str::slug($parentName)],
                [
                    'parent_id' => null,
                    'name' => $parentName,
                    'description' => "Shop curated {$parentName} products across trusted brands and practical price points.",
                    'image_url' => 'categories/'.Str::slug($parentName).'.webp',
                    'icon' => Str::slug($parentName),
                    'is_featured' => $sort < 6,
                    'show_on_home' => $sort < 8,
                    'show_in_navbar' => true,
                    'home_display_order' => $sort,
                    'navbar_display_order' => $sort,
                    'sort_order' => $sort,
                    'status' => 'active',
                ]
            );

            foreach ($children as $childIndex => $childName) {
                Category::query()->updateOrCreate(
                    ['slug' => Str::slug($parentName.' '.$childName)],
                    [
                        'parent_id' => $parent->id,
                        'name' => $childName,
                        'description' => "Discover {$childName} in {$parentName} with reliable stock, rich product details, and seasonal picks.",
                        'image_url' => 'categories/'.Str::slug($parentName).'/'.Str::slug($childName).'.webp',
                        'icon' => Str::slug($childName),
                        'is_featured' => $childIndex < 2,
                        'show_on_home' => false,
                        'show_in_navbar' => true,
                        'home_display_order' => $childIndex,
                        'navbar_display_order' => $childIndex,
                        'sort_order' => $childIndex,
                        'status' => 'active',
                    ]
                );
            }

            $sort++;
        }
    }

    private function seedWarehouses(): void
    {
        $warehouses = [
            ['name' => 'East Coast Fulfillment Center', 'code' => 'ECFC', 'city' => 'Newark', 'state' => 'NJ'],
            ['name' => 'West Coast Fulfillment Center', 'code' => 'WCFC', 'city' => 'Irvine', 'state' => 'CA'],
            ['name' => 'Central Distribution Hub', 'code' => 'CDH', 'city' => 'Dallas', 'state' => 'TX'],
            ['name' => 'Digital Goods Vault', 'code' => 'DGV', 'city' => 'Seattle', 'state' => 'WA'],
            ['name' => 'Returns & Refurbishment Center', 'code' => 'RRC', 'city' => 'Columbus', 'state' => 'OH'],
        ];

        foreach ($warehouses as $warehouse) {
            Warehouse::query()->updateOrCreate(
                ['code' => $warehouse['code']],
                [
                    ...$warehouse,
                    'status' => 'active',
                    'address' => fake()->streetAddress(),
                    'country' => 'United States',
                    'postal_code' => fake()->postcode(),
                ]
            );
        }
    }

    private function seedAttributes(): void
    {
        $attributes = [
            'Color' => ['type' => 'color', 'variant' => true, 'values' => [
                ['Black', '#111827'], ['White', '#f9fafb'], ['Red', '#dc2626'], ['Blue', '#2563eb'], ['Green', '#16a34a'],
                ['Navy', '#1e3a8a'], ['Gray', '#6b7280'], ['Cream', '#f5f5dc'], ['Rose Gold', '#b76e79'], ['Graphite', '#374151'],
            ]],
            'Size' => ['type' => 'select', 'variant' => true, 'values' => ['XS', 'S', 'M', 'L', 'XL', 'XXL']],
            'Storage' => ['type' => 'select', 'variant' => true, 'values' => ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB']],
            'RAM' => ['type' => 'select', 'variant' => true, 'values' => ['4GB', '8GB', '12GB', '16GB', '32GB', '64GB']],
            'Material' => ['type' => 'select', 'variant' => false, 'values' => ['Cotton', 'Leather', 'Polyester', 'Bamboo', 'Oak', 'Stainless Steel', 'Ceramic', 'Aluminum']],
            'Fit' => ['type' => 'select', 'variant' => true, 'values' => ['Slim', 'Regular', 'Relaxed', 'Oversized']],
            'Shoe Size' => ['type' => 'select', 'variant' => true, 'values' => ['7', '8', '9', '10', '11', '12']],
            'Screen Size' => ['type' => 'select', 'variant' => false, 'values' => ['6.1 inch', '13 inch', '14 inch', '15.6 inch', '27 inch', '32 inch']],
            'Processor' => ['type' => 'select', 'variant' => false, 'values' => ['Core i5', 'Core i7', 'Ryzen 5', 'Ryzen 7', 'M-Series']],
            'Connectivity' => ['type' => 'select', 'variant' => false, 'values' => ['Bluetooth', 'Wi-Fi', 'USB-C', '5G', 'NFC']],
            'Capacity' => ['type' => 'select', 'variant' => false, 'values' => ['350ml', '500ml', '1L', '2L', '5L']],
            'Finish' => ['type' => 'select', 'variant' => false, 'values' => ['Matte', 'Glossy', 'Brushed', 'Textured', 'Natural']],
            'Warranty' => ['type' => 'select', 'variant' => false, 'values' => ['6 Months', '1 Year', '2 Years', '3 Years']],
            'Age Group' => ['type' => 'select', 'variant' => false, 'values' => ['Toddler', 'Kids', 'Teen', 'Adult']],
            'Flavor' => ['type' => 'select', 'variant' => true, 'values' => ['Vanilla', 'Chocolate', 'Hazelnut', 'Mint', 'Citrus']],
            'Scent' => ['type' => 'select', 'variant' => true, 'values' => ['Cedar', 'Lavender', 'Fresh Linen', 'Citrus Bloom', 'Unscented']],
            'Pattern' => ['type' => 'select', 'variant' => false, 'values' => ['Solid', 'Striped', 'Check', 'Floral', 'Geometric']],
            'Power' => ['type' => 'select', 'variant' => false, 'values' => ['15W', '30W', '65W', '100W']],
            'Resolution' => ['type' => 'select', 'variant' => false, 'values' => ['1080p', '1440p', '4K', '5K']],
            'Subscription Length' => ['type' => 'select', 'variant' => true, 'values' => ['Monthly', 'Quarterly', 'Annual']],
        ];

        $sort = 0;
        foreach ($attributes as $name => $config) {
            $attribute = ProductAttribute::query()->updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'name' => $name,
                    'type' => $config['type'],
                    'is_filterable' => true,
                    'is_variant_defining' => $config['variant'],
                    'sort_order' => $sort,
                ]
            );

            foreach ($config['values'] as $valueIndex => $value) {
                $label = is_array($value) ? $value[0] : $value;
                ProductAttributeValue::query()->updateOrCreate(
                    ['attribute_id' => $attribute->id, 'slug' => Str::slug($label)],
                    [
                        'value' => $label,
                        'display_value' => $label,
                        'hex_color' => is_array($value) ? $value[1] : null,
                        'sort_order' => $valueIndex,
                    ]
                );
            }

            $sort++;
        }
    }

    private function seedTags(): void
    {
        $tags = [
            'New Arrival', 'Best Seller', 'Staff Pick', 'Limited Edition', 'Eco Friendly', 'Giftable', 'Premium',
            'Budget Friendly', 'Online Exclusive', 'Back in Stock', 'Clearance', 'Bundle Deal', 'Travel Ready',
            'Work From Home', 'Student Favorite', 'Creator Gear', 'Family Essential', 'Holiday Edit',
            'Summer Ready', 'Winter Warmers', 'Lightweight', 'Heavy Duty', 'Organic', 'Handmade', 'Vegan',
            'Water Resistant', 'Fast Charging', 'Wireless', 'Noise Cancelling', 'Ergonomic', 'Compact',
            'Professional', 'Beginner Friendly', 'Refurbished', 'Digital Download', 'Subscription',
            'Made in USA', 'Imported', 'Low Stock', 'Free Shipping',
        ];

        foreach ($tags as $tag) {
            Tag::query()->updateOrCreate(
                ['slug' => Str::slug($tag)],
                ['name' => $tag]
            );
        }
    }
}
