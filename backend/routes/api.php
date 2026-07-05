<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\HomeFeatureCardController;
use App\Http\Controllers\Api\Admin\PermissionManagementController;
use App\Http\Controllers\Api\Admin\ProductModuleController;
use App\Http\Controllers\Api\Admin\RoleManagementController;
use App\Http\Controllers\Api\Admin\Settings\CompanySettingsController;
use App\Http\Controllers\Api\Admin\Settings\CategoryDisplaySettingsController;
use App\Http\Controllers\Api\Admin\Settings\EmailSettingsController;
use App\Http\Controllers\Api\Admin\Settings\HomeFeatureCardSettingsController;
use App\Http\Controllers\Api\Admin\Settings\LocalizationSettingsController;
use App\Http\Controllers\Api\Admin\Settings\MaintenanceModeSettingsController;
use App\Http\Controllers\Api\Admin\Settings\PaymentSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SeoSettingsController;
use App\Http\Controllers\Api\Admin\Settings\ShippingSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SmsProviderSettingsController;
use App\Http\Controllers\Api\Admin\Settings\SocialMediaSettingsController;
use App\Http\Controllers\Api\Admin\Settings\StoreSettingsController;
use App\Http\Controllers\Api\Admin\UserManagementController;
use App\Http\Controllers\Api\BrandCatalogController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CollectionCatalogController;
use App\Http\Controllers\Api\HomePageController;
use App\Http\Controllers\Api\ProductCatalogController;
use App\Http\Controllers\Api\ShippingMethodController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\Settings\NavigationSettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/settings/navigation', [NavigationSettingsController::class, 'show'])->middleware('throttle:public-settings');
Route::get('/home-page', [HomePageController::class, 'show'])->middleware('throttle:public-settings');
Route::get('/brands', [BrandCatalogController::class, 'index'])->middleware('throttle:public-settings');
Route::get('/brands/{slug}', [BrandCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/collections/{slug}', [CollectionCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/products', [ProductCatalogController::class, 'index'])->middleware('throttle:public-settings');
Route::get('/products/{slug}', [ProductCatalogController::class, 'show'])->where('slug', '[A-Za-z0-9\\-]+')->middleware('throttle:public-settings');
Route::get('/shipping-methods', [ShippingMethodController::class, 'index'])->middleware('throttle:public-settings');
Route::middleware(['auth.cookie.optional:access', 'throttle:public-settings'])->group(function (): void {
    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'store']);
    Route::put('/cart/items/{itemId}', [CartController::class, 'update']);
    Route::delete('/cart/items/{itemId}', [CartController::class, 'destroy']);
    Route::delete('/cart/items', [CartController::class, 'clear']);
    Route::post('/cart/merge', [CartController::class, 'merge']);
    Route::post('/cart/coupon', [CartController::class, 'applyCoupon']);
    Route::delete('/cart/coupon', [CartController::class, 'removeCoupon']);

    Route::get('/wishlist', [WishlistController::class, 'show']);
    Route::post('/wishlist/toggle', [WishlistController::class, 'toggle']);
    Route::delete('/wishlist/items/{itemId}', [WishlistController::class, 'destroy']);
    Route::delete('/wishlist/items', [WishlistController::class, 'clear']);
    Route::post('/wishlist/merge', [WishlistController::class, 'merge']);
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

        Route::delete('/roles/bulk', [RoleManagementController::class, 'bulkDestroy']);
        Route::apiResource('roles', RoleManagementController::class);

        Route::delete('/permissions/bulk', [PermissionManagementController::class, 'bulkDestroy']);
        Route::apiResource('permissions', PermissionManagementController::class);

        Route::post('/feature-cards/reorder', [HomeFeatureCardController::class, 'reorder']);
        Route::apiResource('feature-cards', HomeFeatureCardController::class);

        Route::get('/settings/company', [CompanySettingsController::class, 'show']);
        Route::put('/settings/company', [CompanySettingsController::class, 'update']);
        Route::post('/settings/company/upload', [CompanySettingsController::class, 'upload']);

        Route::get('/settings/categories', [CategoryDisplaySettingsController::class, 'show']);
        Route::put('/settings/categories', [CategoryDisplaySettingsController::class, 'update']);

        Route::get('/settings/home-feature-cards', [HomeFeatureCardSettingsController::class, 'show']);
        Route::put('/settings/home-feature-cards', [HomeFeatureCardSettingsController::class, 'update']);

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

        Route::get('/settings/shipping', [ShippingSettingsController::class, 'show']);
        Route::put('/settings/shipping', [ShippingSettingsController::class, 'update']);

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
