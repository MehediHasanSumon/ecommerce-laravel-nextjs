<?php

namespace App\Models\Settings;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreSetting extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enable_reviews' => 'boolean',
            'enable_product_comments' => 'boolean',
            'review_moderation_enabled' => 'boolean',
            'comment_moderation_enabled' => 'boolean',
            'guest_name_required' => 'boolean',
            'guest_email_required' => 'boolean',
            'verified_purchase_badge_enabled' => 'boolean',
            'one_review_per_product' => 'boolean',
            'review_editing_enabled' => 'boolean',
            'review_edit_time_limit_minutes' => 'integer',
            'comment_editing_enabled' => 'boolean',
            'comment_edit_time_limit_minutes' => 'integer',
            'floating_contact_enabled' => 'boolean',
            'messenger_enabled' => 'boolean',
            'whatsapp_enabled' => 'boolean',
            'enable_wishlist' => 'boolean',
            'require_login_before_checkout' => 'boolean',
            'allow_customer_registration' => 'boolean',
            'allow_guest_checkout' => 'boolean',
            'product_slider_loop' => 'boolean',
            'product_slider_autoplay' => 'boolean',
            'product_slider_autoplay_delay' => 'integer',
            'product_slider_transition_speed' => 'integer',
            'product_slider_pause_on_hover' => 'boolean',
            'product_slider_mouse_drag' => 'boolean',
            'product_slider_touch_swipe' => 'boolean',
            'product_slider_navigation' => 'boolean',
            'product_slider_pagination' => 'boolean',
            'product_slider_desktop_slides' => 'integer',
            'product_slider_tablet_slides' => 'integer',
            'product_slider_mobile_slides' => 'integer',
            'product_slider_space_between' => 'integer',
            'product_slider_center_mode' => 'boolean',
            'fraud_detection_enabled' => 'boolean',
            'fraud_auto_check_orders' => 'boolean',
            'fraud_auto_check_customers' => 'boolean',
            'fraud_check_during_checkout' => 'boolean',
            'fraud_check_before_cod_confirmation' => 'boolean',
            'fraud_check_before_shipment' => 'boolean',
            'fraud_score_threshold' => 'integer',
            'fraud_critical_score_threshold' => 'integer',
            'fraud_auto_flag_suspicious_orders' => 'boolean',
            'fraud_auto_hold_high_risk_orders' => 'boolean',
            'fraud_auto_reject_critical_risk_orders' => 'boolean',
            'fraud_block_cod_high_risk' => 'boolean',
            'fraud_require_admin_approval' => 'boolean',
            'fraud_provider_priority' => 'array',
            'fraud_result_caching_enabled' => 'boolean',
            'fraud_cache_duration_minutes' => 'integer',
        ];
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
