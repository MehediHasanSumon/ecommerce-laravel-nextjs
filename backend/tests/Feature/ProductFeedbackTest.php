<?php

use App\Models\Product;
use App\Models\ProductComment;
use App\Models\ProductReview;
use App\Models\User;
use App\Services\Admin\Settings\StoreSettingsService;
use Spatie\Permission\Models\Permission;

function feedbackProduct(): Product
{
    return Product::query()->create([
        'name' => 'Feedback Product',
        'slug' => 'feedback-product',
        'product_type' => 'physical',
        'status' => 'active',
        'base_price_cents' => 2500,
        'currency' => 'USD',
        'track_inventory' => false,
        'published_at' => now(),
    ]);
}

function feedbackToken(User $user): string
{
    return $user->createToken('feedback-test', ['access'], now()->addMinutes(15))->plainTextToken;
}

it('rejects guest reviews when review access is registered only', function (): void {
    $product = feedbackProduct();

    app(StoreSettingsService::class)->update([
        'enable_reviews' => true,
        'review_access' => 'registered',
    ]);

    $this->postJson("/api/products/{$product->slug}/reviews", [
        'rating' => 5,
        'comment' => 'This is a valid review from a guest customer.',
        'guest_name' => 'Guest Customer',
        'guest_email' => 'guest@example.com',
    ])->assertForbidden();

    expect(ProductReview::query()->count())->toBe(0);
});

it('accepts sanitized guest reviews and applies moderation settings', function (): void {
    $product = feedbackProduct();

    app(StoreSettingsService::class)->update([
        'enable_reviews' => true,
        'review_access' => 'everyone',
        'review_moderation_enabled' => true,
        'guest_name_required' => true,
        'guest_email_required' => true,
        'one_review_per_product' => true,
    ]);

    $this->postJson("/api/products/{$product->slug}/reviews", [
        'rating' => 4,
        'comment' => '<script>alert(1)</script> A genuinely useful product review.',
        'guest_name' => '<b>Guest Customer</b>',
        'guest_email' => 'GUEST@EXAMPLE.COM',
    ])
        ->assertCreated()
        ->assertJsonPath('data.review.status', 'pending');

    $review = ProductReview::query()->firstOrFail();

    expect($review->guest_name)->toBe('Guest Customer')
        ->and($review->guest_email)->toBe('guest@example.com')
        ->and($review->comment)->not->toContain('<script>')
        ->and($review->status)->toBe('pending');

    $this->postJson("/api/products/{$product->slug}/reviews", [
        'rating' => 4,
        'comment' => 'A different review from the same guest customer.',
        'guest_name' => 'Guest Customer',
        'guest_email' => 'guest@example.com',
    ])->assertConflict();
});

it('publishes guest comments immediately when moderation is disabled', function (): void {
    $product = feedbackProduct();

    app(StoreSettingsService::class)->update([
        'enable_product_comments' => true,
        'comment_access' => 'everyone',
        'comment_moderation_enabled' => false,
        'guest_name_required' => true,
        'guest_email_required' => true,
    ]);

    $this->postJson("/api/products/{$product->slug}/comments", [
        'content' => 'Does this product include a warranty?',
        'guest_name' => 'Question Customer',
        'guest_email' => 'question@example.com',
    ])
        ->assertCreated()
        ->assertJsonPath('data.comment.status', 'approved');

    $this->getJson("/api/products/{$product->slug}")
        ->assertOk()
        ->assertJsonPath('data.comments.0.user.name', 'Question Customer')
        ->assertJsonPath('data.comments.0.content', 'Does this product include a warranty?');
});

it('enforces registered comment edit ownership and edit windows', function (): void {
    $product = feedbackProduct();
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();

    app(StoreSettingsService::class)->update([
        'enable_product_comments' => true,
        'comment_access' => 'registered',
        'comment_moderation_enabled' => false,
        'comment_editing_enabled' => true,
        'comment_edit_time_limit_minutes' => 60,
    ]);

    $comment = ProductComment::query()->create([
        'product_id' => $product->id,
        'user_id' => $owner->id,
        'content' => 'Original product comment.',
        'submission_hash' => hash('sha256', 'original-comment'),
        'status' => 'approved',
        'approved_at' => now(),
    ]);

    $this->withToken(feedbackToken($otherUser))
        ->putJson("/api/products/{$product->slug}/comments/{$comment->id}", [
            'content' => 'Unauthorized edit attempt.',
        ])
        ->assertNotFound();

    $this->withToken(feedbackToken($owner))
        ->putJson("/api/products/{$product->slug}/comments/{$comment->id}", [
            'content' => 'Updated product comment.',
        ])
        ->assertOk();

    expect($comment->fresh()->content)->toBe('Updated product comment.');
});

it('bulk approves feedback only with the matching permission', function (): void {
    $product = feedbackProduct();
    $review = ProductReview::query()->create([
        'product_id' => $product->id,
        'rating' => 5,
        'comment' => 'Pending review for bulk moderation.',
        'submission_hash' => hash('sha256', 'bulk-review'),
        'status' => 'pending',
    ]);
    $admin = User::factory()->create();

    $this->withToken(feedbackToken($admin))
        ->putJson('/api/admin/product-management/reviews/bulk-status', [
            'ids' => [$review->id],
            'status' => 'approved',
        ])
        ->assertForbidden();

    $permission = Permission::query()->create(['name' => 'can_edit_review', 'guard_name' => 'web']);
    $admin->givePermissionTo($permission);

    $this->withToken(feedbackToken($admin))
        ->putJson('/api/admin/product-management/reviews/bulk-status', [
            'ids' => [$review->id],
            'status' => 'approved',
        ])
        ->assertOk()
        ->assertJsonPath('data.updated', 1);

    expect($review->fresh()->status)->toBe('approved')
        ->and($product->fresh()->review_count)->toBe(1);
});

it('exposes only safe floating contact runtime values', function (): void {
    app(StoreSettingsService::class)->update([
        'floating_contact_enabled' => true,
        'messenger_enabled' => true,
        'messenger_url' => 'https://m.me/example.store',
        'whatsapp_enabled' => true,
        'whatsapp_number' => '+15551234567',
        'whatsapp_message' => 'Hello from the storefront',
    ]);

    $response = $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.floating_contact.enabled', true)
        ->assertJsonPath('data.floating_contact.messenger_url', 'https://m.me/example.store')
        ->assertJsonPath(
            'data.floating_contact.whatsapp_url',
            'https://wa.me/15551234567?text=Hello%20from%20the%20storefront',
        );

    $payload = json_encode($response->json('data'), JSON_THROW_ON_ERROR);

    expect($payload)
        ->not->toContain('"whatsapp_number"')
        ->not->toContain('"whatsapp_message"')
        ->not->toContain('"messenger_enabled"');
});
