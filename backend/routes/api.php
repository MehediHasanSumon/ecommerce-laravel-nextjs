<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\AdminNavigationController;
use App\Http\Controllers\Api\Admin\BlogCommentManagementController;
use App\Http\Controllers\Api\Admin\BlogManagementController;
use App\Http\Controllers\Api\Admin\ContactMessageManagementController;
use App\Http\Controllers\Api\Admin\CourierShipmentController;
use App\Http\Controllers\Api\Admin\CustomerManagementController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\FraudAnalyticsController;
use App\Http\Controllers\Api\Admin\FraudCheckController;
use App\Http\Controllers\Api\Admin\HeroSectionController;
use App\Http\Controllers\Api\Admin\HomeFeatureCardController;
use App\Http\Controllers\Api\Admin\IpBlockManagementController;
use App\Http\Controllers\Api\Admin\MarketingAnalyticsController;
use App\Http\Controllers\Api\Admin\OrderManagementController;
use App\Http\Controllers\Api\Admin\PermissionManagementController;
use App\Http\Controllers\Api\Admin\ProductModuleController;
use App\Http\Controllers\Api\Admin\ReportsController;
use App\Http\Controllers\Api\Admin\RoleManagementController;
use App\Http\Controllers\Api\Admin\SearchAnalyticsController;
use App\Http\Controllers\Api\Admin\Settings\BlogSettingsController;
use App\Http\Controllers\Api\Admin\Settings\CompanySettingsController;
use App\Http\Controllers\Api\Admin\Settings\CourierSettingsController;
use App\Http\Controllers\Api\Admin\Settings\FraudSettingsController;
use App\Http\Controllers\Api\Admin\Settings\GoogleAnalyticsSettingsController;
use App\Http\Controllers\Api\Admin\Settings\HomeFeatureCardSettingsController;
use App\Http\Controllers\Api\Admin\Settings\HomePageSettingsController;
use App\Http\Controllers\Api\Admin\Settings\MetaPixelSettingsController;
use App\Http\Controllers\Api\Admin\Settings\PaymentSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SecuritySettingsController;
use App\Http\Controllers\Api\Admin\Settings\SeoSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SmsSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SocialMediaSettingsController;
use App\Http\Controllers\Api\Admin\Settings\StoreSettingsController;
use App\Http\Controllers\Api\Admin\ShippingMethodManagementController;
use App\Http\Controllers\Api\Admin\ShippingZoneController;
use App\Http\Controllers\Api\Admin\SmsLogController;
use App\Http\Controllers\Api\Admin\UserManagementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BlogCatalogController;
use App\Http\Controllers\Api\BrandCatalogController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\CheckoutOtpController;
use App\Http\Controllers\Api\CollectionCatalogController;
use App\Http\Controllers\Api\ContactMessageController;
use App\Http\Controllers\Api\ContentPageController;
use App\Http\Controllers\Api\CourierWebhookController;
use App\Http\Controllers\Api\CustomerAddressController;
use App\Http\Controllers\Api\HomePageController;
use App\Http\Controllers\Api\MarketingTrackingController;
use App\Http\Controllers\Api\NewsletterSubscriptionController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderTrackingController;
use App\Http\Controllers\Api\PaymentCallbackController;
use App\Http\Controllers\Api\ProductCatalogController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\SeoMetadataController;
use App\Http\Controllers\Api\Settings\NavigationSettingsController;
use App\Http\Controllers\Api\ShippingMethodController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

Route::get('/settings/navigation', [NavigationSettingsController::class, 'show'])->middleware('throttle:public-settings');
Route::get('/seo/defaults', [SeoMetadataController::class, 'defaults'])->middleware('throttle:public-settings');
Route::get('/seo/{type}/{slug}', [SeoMetadataController::class, 'entity'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/seo/sitemap', [SeoMetadataController::class, 'sitemap'])->middleware('throttle:public-settings');
Route::get('/home-page', [HomePageController::class, 'show'])->middleware('throttle:public-settings');
Route::get('/marketing/config', [MarketingTrackingController::class, 'config'])->middleware('throttle:public-settings');
Route::post('/marketing/events', [MarketingTrackingController::class, 'store'])
    ->middleware(['auth.cookie.optional:access', 'throttle:marketing-events']);
Route::get('/blogs', [BlogCatalogController::class, 'index'])->middleware('throttle:public-settings');
Route::get('/blogs/{slug}', [BlogCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/brands', [BrandCatalogController::class, 'index'])->middleware('throttle:public-settings');
Route::get('/brands/{slug}', [BrandCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/collections/{slug}', [CollectionCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/content-pages/{slug}', [ContentPageController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/products', [ProductCatalogController::class, 'index'])->middleware('throttle:public-settings');
Route::middleware(['auth.cookie.optional:access', 'throttle:search'])->group(function (): void {
    Route::get('/search', [ProductCatalogController::class, 'index']);
    Route::get('/search/suggestions', [SearchController::class, 'suggestions']);
    Route::get('/search/trending', [SearchController::class, 'trending']);
    Route::get('/search/recent', [SearchController::class, 'recent']);
});
Route::middleware(['auth.cookie.optional:access', 'throttle:search-write'])->group(function (): void {
    Route::post('/search/click', [SearchController::class, 'click']);
    Route::delete('/search/recent', [SearchController::class, 'clearRecent']);
    Route::delete('/search/recent/{history}', [SearchController::class, 'removeRecent'])->whereNumber('history');
});
Route::get('/products/{slug}', [ProductCatalogController::class, 'show'])
    ->where('slug', '[A-Za-z0-9\\-]+')
    ->middleware(['auth.cookie.optional:access', 'throttle:public-settings']);
Route::get('/reviews', [ProductCatalogController::class, 'reviews'])->middleware('throttle:public-settings');
Route::middleware(['auth.cookie.optional:access', 'throttle:product-feedback'])->group(function (): void {
    Route::post('/products/{product:slug}/reviews', [ProductCatalogController::class, 'storeReview']);
    Route::post('/products/{product:slug}/comments', [ProductCatalogController::class, 'storeComment']);
});
Route::get('/shipping-methods', [ShippingMethodController::class, 'index'])->middleware('throttle:public-settings');
Route::post('/contact-messages', [ContactMessageController::class, 'store'])->middleware('throttle:public-settings');
Route::post('/newsletter/subscribe', [NewsletterSubscriptionController::class, 'store'])->middleware('throttle:public-settings');
Route::post('/order-tracking', [OrderTrackingController::class, 'show'])->middleware('throttle:order-tracking');
Route::post('/courier-webhooks/pathao', [CourierWebhookController::class, 'pathao'])->middleware('throttle:courier-webhook');
Route::match(['get', 'post'], '/payments/{gateway}/callback/{result?}', [PaymentCallbackController::class, 'callback'])->name('payments.callback');
Route::post('/payments/{gateway}/webhook', [PaymentCallbackController::class, 'webhook'])->name('payments.webhook');
Route::middleware(['auth.cookie.optional:access', 'throttle:public-settings'])->group(function (): void {
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'store']);
    Route::put('/cart/items/{itemId}', [CartController::class, 'update']);
    Route::delete('/cart/items/{itemId}', [CartController::class, 'destroy']);
    Route::delete('/cart/items', [CartController::class, 'clear']);
    Route::post('/cart/merge', [CartController::class, 'merge']);
    Route::post('/cart/coupon', [CartController::class, 'applyCoupon']);
    Route::delete('/cart/coupon', [CartController::class, 'removeCoupon']);

    Route::get('/payment/result', [OrderController::class, 'paymentResult']);
    Route::get('/payment/invoice', [OrderController::class, 'paymentInvoice']);
    Route::get('/checkout/payment-methods', [CheckoutController::class, 'paymentMethods']);
    Route::post('/checkout/place-order', [CheckoutController::class, 'place']);
    Route::get('/checkout/mobile-verification', [CheckoutOtpController::class, 'requirements']);
    Route::post('/checkout/mobile-verification/send', [CheckoutOtpController::class, 'send'])->middleware('throttle:checkout-otp');
    Route::post('/checkout/mobile-verification/verify', [CheckoutOtpController::class, 'verify'])->middleware('throttle:checkout-otp-verify');

});

Route::middleware(['auth.cookie:access', 'throttle:public-settings'])->group(function (): void {
    Route::get('/wishlist', [WishlistController::class, 'show']);
    Route::post('/wishlist/toggle', [WishlistController::class, 'toggle']);
    Route::delete('/wishlist/items/{itemId}', [WishlistController::class, 'destroy']);
    Route::delete('/wishlist/items', [WishlistController::class, 'clear']);
    Route::post('/wishlist/merge', [WishlistController::class, 'merge']);
    Route::post('/blogs/{blog:slug}/comments', [BlogCatalogController::class, 'storeComment']);
    Route::apiResource('addresses', CustomerAddressController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::put('/products/{product:slug}/comments/{comment}', [ProductCatalogController::class, 'updateComment'])
        ->middleware('throttle:product-feedback');
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::get('/orders/{order}/invoice', [OrderController::class, 'invoice']);
    Route::get('/account/dashboard', [AccountController::class, 'dashboard']);
    Route::get('/account/profile', [AccountController::class, 'profile']);
    Route::put('/account/profile', [AccountController::class, 'updateProfile']);
    Route::post('/account/profile/avatar', [AccountController::class, 'uploadAvatar']);
    Route::put('/account/password', [AccountController::class, 'changePassword']);
    Route::get('/account/notifications', [AccountController::class, 'notifications']);
    Route::get('/account/notifications/unread-count', [AccountController::class, 'unreadNotificationCount']);
    Route::post('/account/notifications/mark-read', [AccountController::class, 'markNotificationsRead']);
    Route::post('/account/notifications/{notification}/read', [AccountController::class, 'markNotificationRead']);
    Route::delete('/account/notifications', [AccountController::class, 'bulkDeleteNotifications']);
    Route::delete('/account/notifications/{notification}', [AccountController::class, 'deleteNotification']);
    Route::get('/account/reviews', [AccountController::class, 'reviews']);
    Route::put('/account/reviews/{review}', [AccountController::class, 'updateReview']);
    Route::delete('/account/reviews/{review}', [AccountController::class, 'deleteReview']);
});

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth-passwords');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth-passwords');

    Route::get('/session', [AuthController::class, 'session'])->middleware('throttle:auth-token');

    Route::middleware(['auth.cookie:access', 'throttle:auth-token'])->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::prefix('admin')
    ->middleware(['auth.cookie:access', 'throttle:admin-api'])
    ->group(function (): void {
        Route::get('/navigation', [AdminNavigationController::class, 'show'])->middleware('administrator');
        Route::get('/dashboard', [DashboardController::class, 'show']);
        Route::get('/search-analytics', [SearchAnalyticsController::class, 'index']);
        Route::get('/fraud-analytics', [FraudAnalyticsController::class, 'index']);
        Route::get('/marketing-analytics', [MarketingAnalyticsController::class, 'dashboard']);
        Route::get('/marketing-analytics/logs', [MarketingAnalyticsController::class, 'logs']);
        Route::get('/marketing-analytics/status', [MarketingAnalyticsController::class, 'status']);
        Route::get('/fraud-checks', [FraudCheckController::class, 'index']);
        Route::post('/fraud-checks', [FraudCheckController::class, 'store'])->middleware('throttle:fraud-check');
        Route::post('/fraud-checks/bulk', [FraudCheckController::class, 'bulk'])->middleware('throttle:fraud-bulk');
        Route::post('/fraud-checks/clear-cache', [FraudCheckController::class, 'clearCache']);
        Route::get('/fraud-checks/provider-status', [FraudCheckController::class, 'providerStatus']);
        Route::get('/fraud-checks/{check}', [FraudCheckController::class, 'show']);
        Route::post('/orders/{order}/fraud-approval', [FraudCheckController::class, 'approveOrder']);

        Route::get('/ip-blocks/analytics', [IpBlockManagementController::class, 'analytics']);
        Route::post('/ip-blocks/bulk', [IpBlockManagementController::class, 'bulk']);
        Route::post('/ip-blocks/bulk-unblock', [IpBlockManagementController::class, 'bulkUnblock']);
        Route::post('/ip-blocks/delete-expired', [IpBlockManagementController::class, 'deleteExpired']);
        Route::apiResource('ip-blocks', IpBlockManagementController::class);

        Route::delete('/users/bulk', [UserManagementController::class, 'bulkDestroy']);
        Route::apiResource('users', UserManagementController::class);
        Route::get('/customers', [CustomerManagementController::class, 'index']);
        Route::get('/customers/{customer}', [CustomerManagementController::class, 'show']);
        Route::put('/guest-customers/{guestCustomer}', [CustomerManagementController::class, 'update']);

        Route::delete('/blogs/bulk', [BlogManagementController::class, 'bulkDestroy']);
        Route::apiResource('blogs', BlogManagementController::class);
        Route::get('/blog-comments', [BlogCommentManagementController::class, 'index']);
        Route::put('/blog-comments/{comment}', [BlogCommentManagementController::class, 'update']);
        Route::delete('/blog-comments/{comment}', [BlogCommentManagementController::class, 'destroy']);
        Route::get('/contact-messages', [ContactMessageManagementController::class, 'index']);
        Route::put('/contact-messages/{contactMessage}', [ContactMessageManagementController::class, 'update']);
        Route::delete('/contact-messages/{contactMessage}', [ContactMessageManagementController::class, 'destroy']);
        Route::get('/reports/{type}/pdf', [ReportsController::class, 'pdf'])->where('type', '[A-Za-z0-9\\-]+');
        Route::get('/reports/{type}', [ReportsController::class, 'show'])->where('type', '[A-Za-z0-9\\-]+');

        Route::delete('/roles/bulk', [RoleManagementController::class, 'bulkDestroy']);
        Route::apiResource('roles', RoleManagementController::class);

        Route::delete('/permissions/bulk', [PermissionManagementController::class, 'bulkDestroy']);
        Route::apiResource('permissions', PermissionManagementController::class);

        Route::get('/orders', [OrderManagementController::class, 'index']);
        Route::get('/orders/create-options', [OrderManagementController::class, 'createOptions']);
        Route::get('/orders/product-search', [OrderManagementController::class, 'searchProducts']);
        Route::post('/orders', [OrderManagementController::class, 'store']);
        Route::put('/orders/bulk', [OrderManagementController::class, 'bulkUpdate']);
        Route::get('/orders/{order}', [OrderManagementController::class, 'show']);
        Route::put('/orders/{order}', [OrderManagementController::class, 'update']);
        Route::put('/orders/{order}/full', [OrderManagementController::class, 'fullUpdate']);
        Route::delete('/orders/{order}', [OrderManagementController::class, 'destroy']);
        Route::post('/orders/{order}/refund', [OrderManagementController::class, 'refund']);
        Route::post('/orders/{order}/shipping-log', [OrderManagementController::class, 'shippingLog']);
        Route::post('/orders/{order}/courier-shipment', [CourierShipmentController::class, 'store']);
        Route::get('/orders/{order}/invoice', [OrderManagementController::class, 'invoice']);
        Route::get('/orders/{order}/delivery-slip', [OrderManagementController::class, 'deliverySlip']);

        Route::get('/shipments', [CourierShipmentController::class, 'index']);
        Route::get('/shipments/options', [CourierShipmentController::class, 'options']);
        Route::post('/shipments/calculate-charge', [CourierShipmentController::class, 'calculateCharge']);
        Route::post('/shipments/bulk-create', [CourierShipmentController::class, 'bulkCreate']);
        Route::post('/shipments/bulk-sync', [CourierShipmentController::class, 'bulkSync']);
        Route::get('/shipments/{shipment}', [CourierShipmentController::class, 'show']);
        Route::post('/shipments/{shipment}/sync', [CourierShipmentController::class, 'sync']);
        Route::post('/shipments/{shipment}/cancel', [CourierShipmentController::class, 'cancel']);

        Route::delete('/shipping-zones/bulk', [ShippingZoneController::class, 'bulkDestroy']);
        Route::post('/shipping-zones/reorder', [ShippingZoneController::class, 'reorder']);
        Route::apiResource('shipping-zones', ShippingZoneController::class);

        Route::delete('/shipping-methods/bulk', [ShippingMethodManagementController::class, 'bulkDestroy']);
        Route::post('/shipping-methods/reorder', [ShippingMethodManagementController::class, 'reorder']);
        Route::apiResource('shipping-methods', ShippingMethodManagementController::class);

        Route::post('/feature-cards/reorder', [HomeFeatureCardController::class, 'reorder']);
        Route::apiResource('feature-cards', HomeFeatureCardController::class);

        Route::get('/settings/hero-section', [HeroSectionController::class, 'show']);
        Route::put('/settings/hero-section', [HeroSectionController::class, 'updateSettings']);
        Route::post('/settings/hero-section/upload', [HeroSectionController::class, 'upload']);
        Route::post('/hero-slides/reorder', [HeroSectionController::class, 'reorderSlides']);
        Route::post('/hero-slides/{slide}/duplicate', [HeroSectionController::class, 'duplicateSlide']);
        Route::post('/hero-slides', [HeroSectionController::class, 'storeSlide']);
        Route::put('/hero-slides/{slide}', [HeroSectionController::class, 'updateSlide']);
        Route::delete('/hero-slides/{slide}', [HeroSectionController::class, 'destroySlide']);

        Route::get('/settings/company', [CompanySettingsController::class, 'show']);
        Route::put('/settings/company', [CompanySettingsController::class, 'update']);
        Route::post('/settings/company/upload', [CompanySettingsController::class, 'upload']);

        Route::get('/settings/home-feature-cards', [HomeFeatureCardSettingsController::class, 'show']);
        Route::put('/settings/home-feature-cards', [HomeFeatureCardSettingsController::class, 'update']);

        Route::get('/settings/home-page', [HomePageSettingsController::class, 'show']);
        Route::put('/settings/home-page', [HomePageSettingsController::class, 'update']);

        Route::get('/settings/blog', [BlogSettingsController::class, 'show']);
        Route::put('/settings/blog', [BlogSettingsController::class, 'update']);

        Route::get('/settings/store', [StoreSettingsController::class, 'show']);
        Route::put('/settings/store', [StoreSettingsController::class, 'update']);

        Route::get('/settings/payment', [PaymentSettingsController::class, 'show']);
        Route::put('/settings/payment', [PaymentSettingsController::class, 'update']);

        Route::get('/settings/couriers', [CourierSettingsController::class, 'show']);
        Route::put('/settings/couriers', [CourierSettingsController::class, 'update']);
        Route::post('/settings/couriers/{provider}/test', [CourierSettingsController::class, 'test']);
        Route::get('/settings/couriers/{provider}/locations/{type}', [CourierSettingsController::class, 'locations']);

        Route::get('/settings/fraud-detection', [FraudSettingsController::class, 'show']);
        Route::put('/settings/fraud-detection', [FraudSettingsController::class, 'update']);
        Route::get('/settings/fraud-detection/status', [FraudSettingsController::class, 'status']);
        Route::post('/settings/fraud-detection/{provider}/test', [FraudSettingsController::class, 'test'])->middleware('throttle:fraud-check');

        Route::get('/settings/meta-pixel', [MetaPixelSettingsController::class, 'show']);
        Route::put('/settings/meta-pixel', [MetaPixelSettingsController::class, 'update']);
        Route::get('/settings/meta-pixel/status', [MetaPixelSettingsController::class, 'status']);
        Route::post('/settings/meta-pixel/test', [MetaPixelSettingsController::class, 'test'])->middleware('throttle:marketing-test');

        Route::get('/settings/google-analytics', [GoogleAnalyticsSettingsController::class, 'show']);
        Route::put('/settings/google-analytics', [GoogleAnalyticsSettingsController::class, 'update']);
        Route::get('/settings/google-analytics/status', [GoogleAnalyticsSettingsController::class, 'status']);
        Route::post('/settings/google-analytics/test', [GoogleAnalyticsSettingsController::class, 'test'])->middleware('throttle:marketing-test');

        Route::get('/settings/seo', [SeoSettingsController::class, 'show']);
        Route::put('/settings/seo', [SeoSettingsController::class, 'update']);
        Route::post('/settings/seo/upload', [SeoSettingsController::class, 'upload']);

        Route::get('/settings/social', [SocialMediaSettingsController::class, 'show']);
        Route::put('/settings/social', [SocialMediaSettingsController::class, 'update']);

        Route::get('/settings/sms', [SmsSettingsController::class, 'show']);
        Route::put('/settings/sms', [SmsSettingsController::class, 'update']);
        Route::post('/settings/sms/test', [SmsSettingsController::class, 'test']);
        Route::get('/sms-logs', [SmsLogController::class, 'index']);
        Route::get('/sms-logs/{smsLog:public_id}', [SmsLogController::class, 'show']);

        Route::get('/settings/security', [SecuritySettingsController::class, 'show']);
        Route::put('/settings/security', [SecuritySettingsController::class, 'update']);

        Route::get('/product-options', [ProductModuleController::class, 'optionsOnly']);
        Route::put('/product-management/{module}/bulk-status', [ProductModuleController::class, 'bulkStatus']);
        Route::delete('/product-management/{module}/bulk', [ProductModuleController::class, 'bulkDestroy']);
        Route::post('/product-management/{module}/reorder', [ProductModuleController::class, 'reorder']);
        Route::get('/product-management/{module}', [ProductModuleController::class, 'index']);
        Route::post('/product-management/{module}', [ProductModuleController::class, 'store']);
        Route::get('/product-management/{module}/{id}', [ProductModuleController::class, 'show']);
        Route::post('/product-management/{module}/{id}', [ProductModuleController::class, 'update']);
        Route::put('/product-management/{module}/{id}', [ProductModuleController::class, 'update']);
        Route::delete('/product-management/{module}/{id}', [ProductModuleController::class, 'destroy']);
    });
