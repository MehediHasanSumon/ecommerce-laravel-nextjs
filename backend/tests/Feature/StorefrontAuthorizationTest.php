<?php

use App\Models\Blog;
use App\Models\Product;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function storefrontAccessToken(User $user): string
{
    return $user->createToken('storefront-access', ['access'], now()->addMinutes(15))->plainTextToken;
}

function storefrontProduct(): Product
{
    return Product::query()->create([
        'name' => 'Permissionless Storefront Product',
        'slug' => 'permissionless-storefront-product',
        'status' => 'active',
        'product_type' => 'physical',
        'sku' => 'STOREFRONT-001',
        'base_price_cents' => 100000,
        'currency' => 'BDT',
        'track_inventory' => true,
        'stock_quantity' => 10,
        'published_at' => now(),
    ]);
}

it('allows a customer with no Spatie permissions to use authenticated storefront features', function (): void {
    $user = User::factory()->create();
    $token = storefrontAccessToken($user);
    $product = storefrontProduct();

    expect($user->getAllPermissions())->toHaveCount(0);

    foreach ([
        '/api/account/dashboard',
        '/api/account/profile',
        '/api/account/notifications',
        '/api/account/reviews',
        '/api/orders',
        '/api/addresses',
        '/api/wishlist',
        '/api/checkout/payment-methods',
    ] as $uri) {
        $this->withToken($token)->getJson($uri)->assertOk();
    }

    $this->withToken($token)->postJson('/api/addresses', [
        'fullName' => 'Storefront Customer',
        'phone' => '+8801700000000',
        'country' => 'Bangladesh',
        'state' => 'Dhaka',
        'district' => 'Dhaka',
        'city' => 'Dhaka',
        'addressLine' => 'House 1, Road 1',
        'isDefaultBilling' => true,
        'isDefaultShipping' => true,
    ])->assertCreated();

    $this->withToken($token)->postJson('/api/wishlist/toggle', [
        'product_id' => $product->id,
    ])->assertOk()
        ->assertJsonPath('data.wishlist.items.0.product.id', (string) $product->id);

    $this->withToken($token)->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonMissingPath('data.user.permissions');
});

it('requires authentication only for protected storefront features', function (): void {
    $blog = Blog::query()->create([
        'author_id' => User::factory()->create()->id,
        'title' => 'Protected Comment Blog',
        'slug' => 'protected-comment-blog',
        'featured_image' => 'https://example.com/blog.jpg',
        'excerpt' => 'Excerpt',
        'content' => 'Content',
        'status' => 'published',
        'published_at' => now()->subHour(),
        'reading_time_minutes' => 1,
    ]);

    foreach ([
        ['get', '/api/account/dashboard'],
        ['get', '/api/account/profile'],
        ['get', '/api/account/notifications'],
        ['get', '/api/account/reviews'],
        ['get', '/api/orders'],
        ['get', '/api/addresses'],
        ['get', '/api/wishlist'],
        ['get', '/api/checkout/payment-methods'],
        ['post', '/api/blogs/'.$blog->slug.'/comments'],
    ] as [$method, $uri]) {
        $this->json($method, $uri)->assertUnauthorized();
    }
});

it('keeps browsing and guest commerce endpoints free of permission checks', function (): void {
    $product = storefrontProduct();
    $headers = [
        'X-Guest-Token' => 'storefront-authorization-guest',
        'X-Cart-Mode' => 'guest',
    ];

    $this->getJson('/api/products')->assertOk();
    $this->getJson('/api/products/'.$product->slug)->assertOk();

    $this->withHeaders($headers)->postJson('/api/cart/items', [
        'product_id' => $product->id,
        'quantity' => 1,
    ])->assertOk();

    $this->withHeaders($headers)->postJson('/api/cart/coupon', [
        'code' => 'NOT-A-COUPON',
    ])->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'Coupon not found.');
});

it('keeps admin APIs protected by Spatie permissions', function (): void {
    $permission = Permission::query()->create([
        'name' => 'can_view_dashboard',
        'guard_name' => 'web',
    ]);
    $adminRole = Role::query()->create([
        'name' => 'admin',
        'guard_name' => 'web',
    ]);
    $admin = User::factory()->create();
    $admin->assignRole($adminRole);
    $token = storefrontAccessToken($admin);

    $this->withToken($token)->getJson('/api/admin/dashboard')->assertForbidden();

    $admin->givePermissionTo($permission);

    $this->withToken($token)->getJson('/api/admin/dashboard')
        ->assertOk();

    $this->withToken($token)->getJson('/api/auth/me')
        ->assertOk()
        ->assertJsonPath('data.user.permissions.0', 'can_view_dashboard');
});
