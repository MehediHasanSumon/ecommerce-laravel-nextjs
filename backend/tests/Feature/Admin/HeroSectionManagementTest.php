<?php

use App\Models\HeroSlide;
use App\Models\Settings\HeroSetting;
use App\Models\User;

function heroAdminAccessToken(): string
{
    return User::factory()
        ->create()
        ->createToken('access-token', ['access'], now()->addMinutes(15))
        ->plainTextToken;
}

it('updates hero settings and switches the active rendering mode', function () {
    $token = heroAdminAccessToken();

    $this->withToken($token)->putJson('/api/admin/settings/hero-section', [
        'enabled' => true,
        'mode' => 'advanced',
        'slider_autoplay' => true,
        'autoplay_delay' => 4500,
        'infinite_loop' => true,
        'show_navigation' => true,
        'show_pagination' => true,
        'swipe_support' => true,
        'pause_on_hover' => true,
        'lazy_load_images' => true,
    ])->assertOk()
        ->assertJsonPath('data.settings.mode', 'advanced')
        ->assertJsonPath('data.settings.autoplay_delay', 4500);

    $this->assertDatabaseHas('hero_settings', ['mode' => 'advanced', 'autoplay_delay' => 4500]);
});

it('creates updates duplicates reorders and deletes hero slides with canvas elements', function () {
    $token = heroAdminAccessToken();

    $create = $this->withToken($token)->postJson('/api/admin/hero-slides', heroSlidePayload([
        'name' => 'Launch Slide',
        'title' => 'Launch Title',
        'sort_order' => 5,
    ]));

    $create->assertCreated()
        ->assertJsonPath('data.item.name', 'Launch Slide')
        ->assertJsonPath('data.item.elements.0.type', 'heading');

    $id = $create->json('data.item.id');
    $elementId = $create->json('data.item.elements.0.id');

    $this->withToken($token)->putJson("/api/admin/hero-slides/{$id}", heroSlidePayload([
        'title' => 'Updated Title',
        'elements' => [
            [
                'id' => $elementId,
                'type' => 'heading',
                'name' => 'Hero Heading',
                'content' => ['text' => 'Updated Heading'],
                'style' => ['fontSize' => 64, 'color' => '#ffffff'],
                'responsive' => [
                    'desktop' => ['x' => 100, 'y' => 120, 'width' => 520, 'height' => 92],
                    'tablet' => ['x' => 48, 'y' => 90, 'width' => 420, 'height' => 80],
                    'mobile' => ['x' => 24, 'y' => 80, 'width' => 300, 'height' => 70],
                ],
                'z_index' => 3,
                'locked' => false,
                'hidden' => false,
            ],
        ],
    ]))->assertOk()
        ->assertJsonPath('data.item.title', 'Updated Title')
        ->assertJsonPath('data.item.elements.0.content.text', 'Updated Heading');

    $copy = $this->withToken($token)->postJson("/api/admin/hero-slides/{$id}/duplicate")
        ->assertCreated()
        ->assertJsonPath('data.item.title', 'Updated Title');

    $copyId = $copy->json('data.item.id');

    $this->withToken($token)->postJson('/api/admin/hero-slides/reorder', [
        'slides' => [
            ['id' => $copyId, 'sort_order' => 0],
            ['id' => $id, 'sort_order' => 1],
        ],
    ])->assertOk()
        ->assertJsonPath('data.slides.0.id', $copyId);

    $this->withToken($token)->deleteJson("/api/admin/hero-slides/{$id}")
        ->assertOk();

    $this->assertSoftDeleted('hero_slides', ['id' => $id]);
});

it('exposes enabled hero slides through the home page payload', function () {
    HeroSetting::query()->create([
        'enabled' => true,
        'mode' => 'simple',
        'slider_autoplay' => true,
        'autoplay_delay' => 6000,
        'infinite_loop' => true,
        'show_navigation' => true,
        'show_pagination' => true,
        'swipe_support' => true,
        'pause_on_hover' => true,
        'lazy_load_images' => true,
    ]);

    HeroSlide::query()->create([
        'name' => 'Public Slide',
        'background_image' => 'https://example.test/hero.jpg',
        'title' => 'Dynamic Hero',
        'text_alignment' => 'left',
        'overlay' => true,
        'overlay_opacity' => 80,
        'background_overlay' => true,
        'canvas_overlay_opacity' => 40,
        'status' => true,
        'sort_order' => 0,
    ]);

    $this->getJson('/api/home-page')
        ->assertOk()
        ->assertJsonPath('data.hero.settings.mode', 'simple')
        ->assertJsonPath('data.hero.slides.0.title', 'Dynamic Hero');
});

it('validates hero slider and canvas configuration', function () {
    $this->withToken(heroAdminAccessToken())->putJson('/api/admin/settings/hero-section', [
        'enabled' => true,
        'mode' => 'poster',
        'slider_autoplay' => true,
        'autoplay_delay' => 200,
        'infinite_loop' => true,
        'show_navigation' => true,
        'show_pagination' => true,
        'swipe_support' => true,
        'pause_on_hover' => true,
        'lazy_load_images' => true,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['mode', 'autoplay_delay']);
});

function heroSlidePayload(array $overrides = []): array
{
    return [
        'name' => 'Hero Slide',
        'background_image' => 'https://example.test/hero.jpg',
        'mobile_image' => 'https://example.test/hero-mobile.jpg',
        'title' => 'Hero Title',
        'subtitle' => 'Featured',
        'description' => 'Hero copy',
        'primary_button_text' => 'Shop Now',
        'primary_button_url' => '/shop',
        'secondary_button_text' => 'Explore',
        'secondary_button_url' => '/collections',
        'text_alignment' => 'left',
        'overlay' => true,
        'overlay_opacity' => 80,
        'background_color' => '#0f172a',
        'background_gradient' => null,
        'background_overlay' => true,
        'canvas_overlay_opacity' => 40,
        'canvas_size' => [
            'desktop' => ['width' => 1280, 'height' => 620],
            'tablet' => ['width' => 768, 'height' => 560],
            'mobile' => ['width' => 390, 'height' => 480],
        ],
        'status' => true,
        'sort_order' => 0,
        'elements' => [
            [
                'type' => 'heading',
                'name' => 'Hero Heading',
                'content' => ['text' => 'Canvas Heading'],
                'style' => ['fontSize' => 56, 'fontWeight' => 800, 'color' => '#ffffff'],
                'responsive' => [
                    'desktop' => ['x' => 80, 'y' => 100, 'width' => 520, 'height' => 88],
                    'tablet' => ['x' => 48, 'y' => 90, 'width' => 420, 'height' => 80],
                    'mobile' => ['x' => 24, 'y' => 80, 'width' => 300, 'height' => 70],
                ],
                'z_index' => 1,
                'locked' => false,
                'hidden' => false,
            ],
        ],
        ...$overrides,
    ];
}
