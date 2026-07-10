<?php

use Illuminate\Support\Facades\Cache;

beforeEach(function (): void {
    Cache::flush();
});

it('subscribes a visitor to the newsletter', function (): void {
    $this->postJson('/api/newsletter/subscribe', [
        'email' => 'Reader@Example.com',
    ])->assertCreated()
        ->assertJsonPath('message', 'Subscription successful.')
        ->assertJsonPath('data.subscriber.email', 'reader@example.com')
        ->assertJsonPath('data.subscriber.status', 'subscribed');

    $this->assertDatabaseHas('newsletter_subscribers', [
        'email' => 'reader@example.com',
        'status' => 'subscribed',
    ]);
});

it('handles duplicate newsletter subscriptions without creating another row', function (): void {
    $this->postJson('/api/newsletter/subscribe', ['email' => 'reader@example.com'])->assertCreated();

    $this->postJson('/api/newsletter/subscribe', ['email' => 'reader@example.com'])
        ->assertOk()
        ->assertJsonPath('message', 'You are already subscribed.');

    $this->assertDatabaseCount('newsletter_subscribers', 1);
});

it('validates newsletter email addresses', function (): void {
    $this->postJson('/api/newsletter/subscribe', [
        'email' => 'not-an-email',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});
