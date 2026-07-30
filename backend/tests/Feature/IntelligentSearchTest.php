<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use App\Models\ProductCollection;
use App\Models\SearchConversion;
use App\Models\SearchTerm;
use App\Models\Tag;
use App\Models\User;
use App\Services\Search\ProductSearchIndexer;
use App\Services\Search\SearchAnalyticsService;

function searchableProduct(array $overrides = []): Product
{
    return Product::query()->create(array_merge([
        'name' => 'Velocity Running Shoe',
        'slug' => 'velocity-running-shoe-'.uniqid(),
        'status' => 'active',
        'sku' => 'RUN-'.uniqid(),
        'product_type' => 'physical',
        'short_description' => 'Lightweight daily trainer',
        'description' => 'A comfortable performance shoe for road running.',
        'base_price_cents' => 12000,
        'currency' => 'USD',
        'track_inventory' => true,
        'stock_quantity' => 20,
        'rating_average' => 4.7,
        'review_count' => 18,
        'published_at' => now(),
    ], $overrides));
}

function buildSearchFixture(): Product
{
    $brand = Brand::query()->create([
        'name' => 'Nike',
        'slug' => 'nike',
        'status' => 'active',
    ]);
    $parent = Category::query()->create([
        'name' => 'Footwear',
        'slug' => 'footwear',
        'status' => 'active',
    ]);
    $category = Category::query()->create([
        'parent_id' => $parent->id,
        'name' => 'Running Shoes',
        'slug' => 'running-shoes',
        'status' => 'active',
    ]);
    $product = searchableProduct([
        'brand_id' => $brand->id,
        'category_id' => $category->id,
        'sku' => 'NIKE-RUN-001',
    ]);
    $tag = Tag::query()->create(['name' => 'Marathon', 'slug' => 'marathon']);
    $collection = ProductCollection::query()->create([
        'name' => 'Performance Essentials',
        'slug' => 'performance-essentials',
        'type' => 'manual',
        'collection_type' => 'manual',
        'status' => 'active',
        'display_position_anchor' => 'products',
        'display_position_placement' => 'after',
    ]);
    $attribute = ProductAttribute::query()->create([
        'name' => 'Material',
        'slug' => 'material',
        'type' => 'text',
    ]);
    $value = ProductAttributeValue::query()->create([
        'attribute_id' => $attribute->id,
        'value' => 'Breathable Mesh',
        'slug' => 'breathable-mesh',
    ]);
    $product->tags()->sync([$tag->id]);
    $product->collections()->sync([$collection->id => ['sort_order' => 0]]);
    $product->attributeValues()->sync([$value->id => ['attribute_id' => $attribute->id]]);
    $product->seo()->create([
        'meta_title' => 'Fast road running shoes',
        'meta_description' => 'Responsive running footwear',
        'meta_keywords' => 'runner, training, race',
    ]);
    app(ProductSearchIndexer::class)->index($product);

    return $product;
}

it('ranks exact names first and supports typo tolerant multi-field search', function (): void {
    $product = buildSearchFixture();
    $other = searchableProduct([
        'name' => 'Running Accessories Pack',
        'slug' => 'running-accessories-pack',
        'sku' => 'ACC-001',
        'rating_average' => 5,
        'review_count' => 100,
    ]);
    app(ProductSearchIndexer::class)->index($other);

    $this->getJson('/api/search?search=Velocity%20Running%20Shoe&per_page=10')
        ->assertOk()
        ->assertJsonPath('data.items.0.id', (string) $product->id)
        ->assertJsonPath('data.search.query', 'Velocity Running Shoe')
        ->assertJsonStructure(['meta' => ['search' => ['event_id', 'query']]]);

    $this->getJson('/api/search?search=nike%20runnng&per_page=10')
        ->assertOk()
        ->assertJsonPath('data.items.0.id', (string) $product->id);

    $this->getJson('/api/search?search=breathable%20mesh&per_page=10')
        ->assertOk()
        ->assertJsonPath('data.items.0.id', (string) $product->id);

    $this->getJson('/api/search?search=running&category=running-shoes&collection=performance-essentials&per_page=10')
        ->assertOk()
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.id', (string) $product->id);
});

it('returns grouped cached suggestions without recording every keystroke as a search', function (): void {
    buildSearchFixture();

    $this->getJson('/api/search/suggestions?q=run&limit=5')
        ->assertOk()
        ->assertJsonPath('data.suggestions.products.0.name', 'Velocity Running Shoe')
        ->assertJsonPath('data.suggestions.categories.0.name', 'Running Shoes')
        ->assertJsonPath('data.suggestions.brands.0.name', null)
        ->assertJsonStructure(['data' => ['suggestions' => [
            'products',
            'categories',
            'brands',
            'collections',
            'tags',
            'popular',
            'recent',
            'trending',
        ]]]);

    expect(SearchTerm::query()->count())->toBe(0);
});

it('stores bounded recent history for authenticated users and tracks clicks', function (): void {
    $product = buildSearchFixture();
    $user = User::factory()->create();
    $token = $user->createToken('search-test', ['access'], now()->addMinutes(15))->plainTextToken;

    $response = $this->withToken($token)
        ->getJson('/api/search?search=running&per_page=10')
        ->assertOk();
    $eventId = $response->json('meta.search.event_id');

    $this->withToken($token)->postJson('/api/search/click', [
        'event_id' => $eventId,
        'target_type' => 'product',
        'target_id' => $product->id,
        'target_slug' => $product->slug,
        'position' => 1,
    ])->assertCreated();

    $this->withToken($token)
        ->getJson('/api/search/recent')
        ->assertOk()
        ->assertJsonPath('data.items.0.keyword', 'running');

    expect(SearchTerm::query()->where('normalized_keyword', 'running')->value('click_count'))->toBe(1);

    $this->withToken($token)->deleteJson('/api/search/recent')->assertOk();
    $this->withToken($token)->getJson('/api/search/recent')->assertJsonCount(0, 'data.items');
});

it('protects search analytics with the dedicated permission', function (): void {
    buildSearchFixture();
    $this->getJson('/api/search?search=running')->assertOk();

    $this->withToken(accessTokenWithPermissions([]))
        ->getJson('/api/admin/search-analytics')
        ->assertForbidden();

    $this->withToken(accessTokenWithPermissions(['can_view_search_analytics']))
        ->getJson('/api/admin/search-analytics')
        ->assertOk()
        ->assertJsonPath('data.analytics.summary.0.key', 'searches')
        ->assertJsonPath('data.items.0.keyword', 'running');
});

it('attributes an order conversion to a search event exactly once', function (): void {
    buildSearchFixture();
    $response = $this->getJson('/api/search?search=running')->assertOk();
    $eventId = $response->json('meta.search.event_id');
    $order = Order::query()->create([
        'order_number' => 'ORD-SEARCH-CONVERSION',
        'status' => 'pending',
        'payment_status' => 'paid',
        'shipping_status' => 'pending',
        'payment_method' => 'cash_on_delivery',
        'currency' => 'USD',
        'subtotal_cents' => 12000,
        'item_discount_cents' => 0,
        'coupon_discount_cents' => 0,
        'shipping_cents' => 0,
        'tax_cents' => 0,
        'total_cents' => 12000,
        'billing_address' => ['name' => 'Search Customer'],
        'shipping_address' => ['name' => 'Search Customer'],
        'summary_snapshot' => [],
        'placed_at' => now(),
    ]);

    $analytics = app(SearchAnalyticsService::class);
    $analytics->recordConversion($order, $eventId);
    $analytics->recordConversion($order, $eventId);

    expect(SearchConversion::query()->where('order_id', $order->id)->count())->toBe(1)
        ->and(SearchTerm::query()->where('normalized_keyword', 'running')->value('conversion_count'))->toBe(1);
});

it('reindexes missing product search documents through the stale command', function (): void {
    $product = searchableProduct(['name' => 'Command Indexed Product']);

    expect($product->searchDocument()->exists())->toBeFalse();

    $this->artisan('search:reindex-products --stale --limit=1')
        ->assertSuccessful();

    expect($product->searchDocument()->exists())->toBeTrue();
});
