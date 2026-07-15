<?php

namespace App\Http\Requests\Admin\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStoreSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('allow_guest_checkout')) {
            $this->merge([
                'require_login_before_checkout' => ! $this->boolean('allow_guest_checkout'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'enable_reviews' => ['boolean'],
            'enable_wishlist' => ['boolean'],
            'require_login_before_checkout' => ['boolean'],
            'allow_customer_registration' => ['boolean'],
            'allow_guest_checkout' => ['boolean'],
            'product_card_style' => ['required', Rule::in(['simple', 'hover', 'hover_review'])],
            'product_layout' => ['required', Rule::in(['grid', 'swipe', 'list'])],
            'product_slider_loop' => ['boolean'],
            'product_slider_autoplay' => ['boolean'],
            'product_slider_autoplay_delay' => ['integer', 'min:1000', 'max:60000'],
            'product_slider_transition_speed' => ['integer', 'min:100', 'max:3000'],
            'product_slider_pause_on_hover' => ['boolean'],
            'product_slider_mouse_drag' => ['boolean'],
            'product_slider_touch_swipe' => ['boolean'],
            'product_slider_navigation' => ['boolean'],
            'product_slider_pagination' => ['boolean'],
            'product_slider_desktop_slides' => ['integer', 'min:1', 'max:8'],
            'product_slider_tablet_slides' => ['integer', 'min:1', 'max:6'],
            'product_slider_mobile_slides' => ['integer', 'min:1', 'max:3'],
            'product_slider_space_between' => ['integer', 'min:0', 'max:64'],
            'product_slider_center_mode' => ['boolean'],
        ];
    }
}
