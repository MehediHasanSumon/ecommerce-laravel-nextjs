<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\HomeFeatureCardController;
use App\Http\Controllers\Api\Admin\BlogCommentManagementController;
use App\Http\Controllers\Api\Admin\BlogManagementController;
use App\Http\Controllers\Api\Admin\PermissionManagementController;
use App\Http\Controllers\Api\Admin\OrderManagementController;
use App\Http\Controllers\Api\Admin\ProductModuleController;
use App\Http\Controllers\Api\Admin\RoleManagementController;
use App\Http\Controllers\Api\Admin\ShippingMethodManagementController;
use App\Http\Controllers\Api\Admin\ShippingZoneController;
use App\Http\Controllers\Api\Admin\Settings\BlogSettingsController;
use App\Http\Controllers\Api\Admin\Settings\CompanySettingsController;
use App\Http\Controllers\Api\Admin\Settings\CategoryDisplaySettingsController;
use App\Http\Controllers\Api\Admin\Settings\EmailSettingsController;
use App\Http\Controllers\Api\Admin\Settings\HomeFeatureCardSettingsController;
use App\Http\Controllers\Api\Admin\Settings\LocalizationSettingsController;
use App\Http\Controllers\Api\Admin\Settings\MaintenanceModeSettingsController;
use App\Http\Controllers\Api\Admin\Settings\PaymentSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SeoSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SmsProviderSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SocialMediaSettingsController;
use App\Http\Controllers\Api\Admin\Settings\StoreSettingsController;
use App\Http\Controllers\Api\Admin\UserManagementController;
use App\Http\Controllers\Api\BrandCatalogController;
use App\Http\Controllers\Api\BlogCatalogController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\CollectionCatalogController;
use App\Http\Controllers\Api\ContentPageController;
use App\Http\Controllers\Api\CustomerAddressController;
use App\Http\Controllers\Api\HomePageController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentCallbackController;
use App\Http\Controllers\Api\ProductCatalogController;
use App\Http\Controllers\Api\ShippingMethodController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\Settings\NavigationSettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/settings/navigation', [NavigationSettingsController::class, 'show'])->middleware('throttle:public-settings');
Route::get('/home-page', [HomePageController::class, 'show'])->middleware('throttle:public-settings');
Route::get('/blogs/home', [BlogCatalogController::class, 'home'])->middleware('throttle:public-settings');
Route::get('/blogs', [BlogCatalogController::class, 'index'])->middleware('throttle:public-settings');
Route::get('/blogs/{slug}', [BlogCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/brands', [BrandCatalogController::class, 'index'])->middleware('throttle:public-settings');
Route::get('/brands/{slug}', [BrandCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/collections/{slug}', [CollectionCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/content-pages/{slug}', [ContentPageController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/products', [ProductCatalogController::class, 'index'])->middleware('throttle:public-settings');
Route::get('/products/{slug}', [ProductCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/reviews', [ProductCatalogController::class, 'reviews'])->middleware('throttle:public-settings');
Route::get('/shipping-methods', [ShippingMethodController::class, 'index'])->middleware('throttle:public-settings');
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

    Route::get('/checkout/payment-methods', [CheckoutController::class, 'paymentMethods']);
    Route::post('/checkout/place-order', [CheckoutController::class, 'place']);
    Route::get('/payment/result', [OrderController::class, 'paymentResult']);

    Route::get('/wishlist', [WishlistController::class, 'show']);
    Route::post('/wishlist/toggle', [WishlistController::class, 'toggle']);
    Route::delete('/wishlist/items/{itemId}', [WishlistController::class, 'destroy']);
    Route::delete('/wishlist/items', [WishlistController::class, 'clear']);
    Route::post('/wishlist/merge', [WishlistController::class, 'merge']);

    Route::post('/blogs/{blog:slug}/comments', [BlogCatalogController::class, 'storeComment']);
});

Route::middleware(['auth.cookie:access', 'throttle:public-settings'])->group(function (): void {
    Route::apiResource('addresses', CustomerAddressController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::post('/products/{product:slug}/reviews', [ProductCatalogController::class, 'storeReview']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::post('/orders/{order}/cancel', [OrderController::class, 'cancel']);
    Route::get('/orders/{order}/invoice', [OrderController::class, 'invoice']);
    Route::get('/account/dashboard', [AccountController::class, 'dashboard']);
    Route::get('/account/profile', [AccountController::class, 'profile']);
    Route::put('/account/profile', [AccountController::class, 'updateProfile']);
    Route::post('/account/profile/avatar', [AccountController::class, 'uploadAvatar']);
    Route::put('/account/password', [AccountController::class, 'changePassword']);
    Route::get('/account/settings', [AccountController::class, 'settings']);
    Route::put('/account/settings', [AccountController::class, 'updateSettings']);
    Route::get('/account/notifications', [AccountController::class, 'notifications']);
    Route::post('/account/notifications/mark-read', [AccountController::class, 'markNotificationsRead']);
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
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('throttle:auth-token');

    Route::middleware(['auth.cookie:access', 'throttle:auth-token'])->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::prefix('admin')
    ->middleware(['auth.cookie:access', 'throttle:admin-api'])
    ->group(function (): void {
        Route::delete('/users/bulk', [UserManagementController::class, 'bulkDestroy']);
        Route::apiResource('users', UserManagementController::class);

        Route::delete('/blogs/bulk', [BlogManagementController::class, 'bulkDestroy']);
        Route::apiResource('blogs', BlogManagementController::class);
        Route::get('/blog-comments', [BlogCommentManagementController::class, 'index']);
        Route::put('/blog-comments/{comment}', [BlogCommentManagementController::class, 'update']);
        Route::delete('/blog-comments/{comment}', [BlogCommentManagementController::class, 'destroy']);

        Route::delete('/roles/bulk', [RoleManagementController::class, 'bulkDestroy']);
        Route::apiResource('roles', RoleManagementController::class);

        Route::delete('/permissions/bulk', [PermissionManagementController::class, 'bulkDestroy']);
        Route::apiResource('permissions', PermissionManagementController::class);

        Route::get('/orders', [OrderManagementController::class, 'index']);
        Route::get('/orders/{order}', [OrderManagementController::class, 'show']);
        Route::put('/orders/{order}', [OrderManagementController::class, 'update']);

        Route::delete('/shipping-zones/bulk', [ShippingZoneController::class, 'bulkDestroy']);
        Route::apiResource('shipping-zones', ShippingZoneController::class);

        Route::delete('/shipping-methods/bulk', [ShippingMethodManagementController::class, 'bulkDestroy']);
        Route::apiResource('shipping-methods', ShippingMethodManagementController::class);

        Route::post('/feature-cards/reorder', [HomeFeatureCardController::class, 'reorder']);
        Route::apiResource('feature-cards', HomeFeatureCardController::class);

        Route::get('/settings/company', [CompanySettingsController::class, 'show']);
        Route::put('/settings/company', [CompanySettingsController::class, 'update']);
        Route::post('/settings/company/upload', [CompanySettingsController::class, 'upload']);

        Route::get('/settings/categories', [CategoryDisplaySettingsController::class, 'show']);
        Route::put('/settings/categories', [CategoryDisplaySettingsController::class, 'update']);

        Route::get('/settings/home-feature-cards', [HomeFeatureCardSettingsController::class, 'show']);
        Route::put('/settings/home-feature-cards', [HomeFeatureCardSettingsController::class, 'update']);

        Route::get('/settings/blog', [BlogSettingsController::class, 'show']);
        Route::put('/settings/blog', [BlogSettingsController::class, 'update']);

        Route::get('/settings/store', [StoreSettingsController::class, 'show']);
        Route::put('/settings/store', [StoreSettingsController::class, 'update']);

        Route::get('/settings/email', [EmailSettingsController::class, 'show']);
        Route::put('/settings/email', [EmailSettingsController::class, 'update']);
        Route::post('/settings/email/test', [EmailSettingsController::class, 'test']);

        Route::get('/settings/sms', [SmsProviderSettingsController::class, 'show']);
        Route::put('/settings/sms', [SmsProviderSettingsController::class, 'update']);
        Route::post('/settings/sms/{provider}/test', [SmsProviderSettingsController::class, 'test']);

        Route::get('/settings/payment', [PaymentSettingsController::class, 'show']);
        Route::put('/settings/payment', [PaymentSettingsController::class, 'update']);

        Route::get('/settings/seo', [SeoSettingsController::class, 'show']);
        Route::put('/settings/seo', [SeoSettingsController::class, 'update']);
        Route::post('/settings/seo/upload', [SeoSettingsController::class, 'upload']);

        Route::get('/settings/social', [SocialMediaSettingsController::class, 'show']);
        Route::put('/settings/social', [SocialMediaSettingsController::class, 'update']);

        Route::get('/settings/localization', [LocalizationSettingsController::class, 'show']);
        Route::put('/settings/localization', [LocalizationSettingsController::class, 'update']);

        Route::get('/settings/maintenance', [MaintenanceModeSettingsController::class, 'show']);
        Route::put('/settings/maintenance', [MaintenanceModeSettingsController::class, 'update']);
        Route::post('/settings/maintenance/upload', [MaintenanceModeSettingsController::class, 'upload']);

        Route::get('/product-options', [ProductModuleController::class, 'optionsOnly']);
        Route::delete('/product-management/{module}/bulk', [ProductModuleController::class, 'bulkDestroy']);
        Route::get('/product-management/{module}', [ProductModuleController::class, 'index']);
        Route::post('/product-management/{module}', [ProductModuleController::class, 'store']);
        Route::get('/product-management/{module}/{id}', [ProductModuleController::class, 'show']);
        Route::post('/product-management/{module}/{id}', [ProductModuleController::class, 'update']);
        Route::put('/product-management/{module}/{id}', [ProductModuleController::class, 'update']);
        Route::delete('/product-management/{module}/{id}', [ProductModuleController::class, 'destroy']);
    });
