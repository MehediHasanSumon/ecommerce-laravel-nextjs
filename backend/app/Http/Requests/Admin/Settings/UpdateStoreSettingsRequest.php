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

        if ($this->has('messenger_url')) {
            $this->merge(['messenger_url' => trim((string) $this->input('messenger_url'))]);
        }

        if ($this->has('whatsapp_number')) {
            $number = preg_replace('/[\s().-]+/', '', (string) $this->input('whatsapp_number'));
            $this->merge(['whatsapp_number' => $number ?: null]);
        }

        if ($this->has('whatsapp_message')) {
            $this->merge(['whatsapp_message' => trim(strip_tags((string) $this->input('whatsapp_message')))]);
        }
    }

    public function rules(): array
    {
        return [
            'enable_reviews' => ['boolean'],
            'enable_product_comments' => ['boolean'],
            'review_access' => ['required', Rule::in(['registered', 'everyone'])],
            'comment_access' => ['required', Rule::in(['registered', 'everyone'])],
            'review_moderation_enabled' => ['boolean'],
            'comment_moderation_enabled' => ['boolean'],
            'guest_name_required' => ['boolean'],
            'guest_email_required' => ['boolean'],
            'verified_purchase_badge_enabled' => ['boolean'],
            'one_review_per_product' => ['boolean'],
            'review_editing_enabled' => ['boolean'],
            'review_edit_time_limit_minutes' => ['required', 'integer', 'min:0', 'max:525600'],
            'comment_editing_enabled' => ['boolean'],
            'comment_edit_time_limit_minutes' => ['required', 'integer', 'min:0', 'max:525600'],
            'floating_contact_enabled' => ['boolean'],
            'messenger_enabled' => ['boolean'],
            'messenger_url' => [
                Rule::requiredIf($this->boolean('floating_contact_enabled') && $this->boolean('messenger_enabled')),
                'nullable',
                'url:https',
                'max:2048',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! $value) {
                        return;
                    }

                    $host = mb_strtolower((string) parse_url((string) $value, PHP_URL_HOST));
                    $allowed = $host === 'm.me'
                        || $host === 'messenger.com'
                        || str_ends_with($host, '.messenger.com')
                        || $host === 'facebook.com'
                        || str_ends_with($host, '.facebook.com');

                    if (! $allowed) {
                        $fail('The Messenger URL must use an official Facebook Messenger domain.');
                    }
                },
            ],
            'whatsapp_enabled' => ['boolean'],
            'whatsapp_number' => [
                Rule::requiredIf($this->boolean('floating_contact_enabled') && $this->boolean('whatsapp_enabled')),
                'nullable',
                'regex:/^\+?[1-9][0-9]{6,14}$/',
            ],
            'whatsapp_message' => ['nullable', 'string', 'max:500'],
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
            'automatic_shipment_creation' => ['required', Rule::in(['disabled', 'after_order_confirmation', 'after_payment', 'after_packaging', 'after_processing'])],
            'automatic_courier_provider' => [
                Rule::requiredIf($this->input('automatic_shipment_creation') !== 'disabled'),
                'nullable',
                Rule::in(['steadfast', 'pathao']),
            ],
            'fraud_detection_enabled' => ['sometimes', 'boolean'],
            'fraud_auto_check_orders' => ['sometimes', 'boolean'],
            'fraud_auto_check_customers' => ['sometimes', 'boolean'],
            'fraud_check_during_checkout' => ['sometimes', 'boolean'],
            'fraud_check_before_cod_confirmation' => ['sometimes', 'boolean'],
            'fraud_check_before_shipment' => ['sometimes', 'boolean'],
            'fraud_score_threshold' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'fraud_critical_score_threshold' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'fraud_auto_flag_suspicious_orders' => ['sometimes', 'boolean'],
            'fraud_auto_hold_high_risk_orders' => ['sometimes', 'boolean'],
            'fraud_auto_reject_critical_risk_orders' => ['sometimes', 'boolean'],
            'fraud_block_cod_high_risk' => ['sometimes', 'boolean'],
            'fraud_require_admin_approval' => ['sometimes', 'boolean'],
            'fraud_provider_priority' => ['sometimes', 'array', 'size:3'],
            'fraud_provider_priority.*' => ['required', Rule::in(['fraudpeek', 'fraud_bd', 'fraudbd']), 'distinct'],
            'fraud_result_caching_enabled' => ['sometimes', 'boolean'],
            'fraud_cache_duration_minutes' => ['sometimes', 'integer', 'min:1', 'max:43200'],
        ];
    }
}
