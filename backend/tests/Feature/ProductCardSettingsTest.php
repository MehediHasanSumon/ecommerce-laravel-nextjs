<?php

use App\Http\Requests\Admin\Settings\UpdateStoreSettingsRequest;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

beforeEach(function (): void {
    Cache::flush();
});

it('persists product card settings and exposes the typed runtime payload', function (): void {
    $service = app(StoreSettingsService::class);

    $service->update([
        'product_card_style' => 'hover',
        'product_layout' => 'swipe',
        'product_slider_loop' => false,
        'product_slider_autoplay' => true,
        'product_slider_autoplay_delay' => 3500,
        'product_slider_transition_speed' => 650,
        'product_slider_pause_on_hover' => false,
        'product_slider_mouse_drag' => true,
        'product_slider_touch_swipe' => true,
        'product_slider_navigation' => false,
        'product_slider_pagination' => true,
        'product_slider_desktop_slides' => 5,
        'product_slider_tablet_slides' => 3,
        'product_slider_mobile_slides' => 1,
        'product_slider_space_between' => 18,
        'product_slider_center_mode' => true,
    ]);

    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.product_card_settings.style', 'hover')
        ->assertJsonPath('data.product_card_settings.layout', 'swipe')
        ->assertJsonPath('data.product_card_settings.slider.loop', false)
        ->assertJsonPath('data.product_card_settings.slider.autoplay', true)
        ->assertJsonPath('data.product_card_settings.slider.autoplay_delay', 3500)
        ->assertJsonPath('data.product_card_settings.slider.transition_speed', 650)
        ->assertJsonPath('data.product_card_settings.slider.navigation', false)
        ->assertJsonPath('data.product_card_settings.slider.pagination', true)
        ->assertJsonPath('data.product_card_settings.slider.desktop_slides', 5)
        ->assertJsonPath('data.product_card_settings.slider.mobile_slides', 1)
        ->assertJsonPath('data.product_card_settings.slider.space_between', 18)
        ->assertJsonPath('data.product_card_settings.slider.center_mode', true);
});

it('validates product card modes and slider limits', function (): void {
    $request = new UpdateStoreSettingsRequest;
    $validator = Validator::make([
        'product_card_style' => 'unsupported',
        'product_layout' => 'carousel',
        'product_slider_autoplay_delay' => 500,
        'product_slider_transition_speed' => 5000,
        'product_slider_desktop_slides' => 9,
        'product_slider_tablet_slides' => 0,
        'product_slider_mobile_slides' => 4,
        'product_slider_space_between' => 100,
    ], $request->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->keys())->toContain(
            'product_card_style',
            'product_layout',
            'product_slider_autoplay_delay',
            'product_slider_transition_speed',
            'product_slider_desktop_slides',
            'product_slider_tablet_slides',
            'product_slider_mobile_slides',
            'product_slider_space_between',
        );
});
