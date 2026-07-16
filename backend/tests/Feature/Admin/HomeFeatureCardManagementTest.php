<?php

use App\Models\HomeFeatureCard;
use App\Models\Settings\HomeFeatureCardSetting;

function adminAccessToken(): string
{
    return accessTokenWithPermissions([
        'can_view_home_feature_card_setting',
        'can_create_home_feature_card_setting',
        'can_edit_home_feature_card_setting',
        'can_delete_home_feature_card_setting',
    ]);
}

it('manages feature cards through the admin api', function () {
    $token = adminAccessToken();

    $create = $this->withToken($token)->postJson('/api/admin/feature-cards', [
        'icon' => 'Truck',
        'title' => 'Free Shipping',
        'description' => 'On orders over $75',
        'sort_order' => 10,
        'status' => true,
    ]);

    $create->assertCreated()
        ->assertJsonPath('data.item.title', 'Free Shipping')
        ->assertJsonPath('data.item.status', true);

    $id = $create->json('data.item.id');

    $this->withToken($token)->putJson("/api/admin/feature-cards/{$id}", [
        'icon' => 'Shield',
        'title' => 'Secure Payment',
        'description' => '256-bit SSL encryption',
        'sort_order' => 2,
        'status' => false,
    ])->assertOk()
        ->assertJsonPath('data.item.icon', 'Shield')
        ->assertJsonPath('data.item.status', false);

    $this->withToken($token)->getJson('/api/admin/feature-cards?sort=sort_order&direction=asc')
        ->assertOk()
        ->assertJsonPath('data.items.0.title', 'Secure Payment');

    $this->withToken($token)->deleteJson("/api/admin/feature-cards/{$id}")
        ->assertOk();

    $this->assertSoftDeleted('home_feature_cards', ['id' => $id]);
});

it('validates required feature card fields', function () {
    $this->withToken(adminAccessToken())->postJson('/api/admin/feature-cards', [
        'icon' => '',
        'title' => '',
        'description' => '',
        'sort_order' => 'high',
        'status' => true,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['icon', 'title', 'description', 'sort_order']);
});

it('reorders feature cards and only exposes active cards when the section is enabled', function () {
    $token = adminAccessToken();
    HomeFeatureCardSetting::query()->create(['enabled' => true]);
    $inactive = HomeFeatureCard::query()->create([
        'icon' => 'X',
        'title' => 'Hidden',
        'description' => 'Should not render',
        'sort_order' => 0,
        'status' => false,
    ]);
    $second = HomeFeatureCard::query()->create([
        'icon' => 'Shield',
        'title' => 'Second',
        'description' => 'Second card',
        'sort_order' => 2,
        'status' => true,
    ]);
    $first = HomeFeatureCard::query()->create([
        'icon' => 'Truck',
        'title' => 'First',
        'description' => 'First card',
        'sort_order' => 1,
        'status' => true,
    ]);

    $this->withToken($token)->postJson('/api/admin/feature-cards/reorder', [
        'cards' => [
            ['id' => $second->id, 'sort_order' => 0],
            ['id' => $first->id, 'sort_order' => 1],
            ['id' => $inactive->id, 'sort_order' => 2],
        ],
    ])->assertOk()
        ->assertJsonPath('data.items.0.id', $second->id);

    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.feature_card_settings.enabled', true)
        ->assertJsonPath('data.home_feature_cards.0.title', 'Second')
        ->assertJsonMissingPath('data.home_feature_cards.2');
});

it('hides runtime feature cards when the section setting is disabled', function () {
    $token = adminAccessToken();
    HomeFeatureCardSetting::query()->create(['enabled' => true]);
    HomeFeatureCard::query()->create([
        'icon' => 'Truck',
        'title' => 'Visible When Enabled',
        'description' => 'Runtime card',
        'sort_order' => 0,
        'status' => true,
    ]);

    $this->withToken($token)->putJson('/api/admin/settings/home-feature-cards', [
        'enabled' => false,
    ])->assertOk()
        ->assertJsonPath('data.settings.enabled', false);

    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.feature_card_settings.enabled', false)
        ->assertJsonPath('data.home_feature_cards', []);
});
