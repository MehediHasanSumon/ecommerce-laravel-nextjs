<?php

namespace App\Providers;

use App\Models\ProductReview;
use App\Observers\ProductReviewObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ProductReview::observe(ProductReviewObserver::class);

        RateLimiter::for('auth-register', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));

        RateLimiter::for('auth-login', function (Request $request) {
            $email = mb_strtolower((string) $request->input('email'));

            return [
                Limit::perMinute(5)->by($email.'|'.$request->ip()),
                Limit::perMinute(30)->by($request->ip()),
            ];
        });

        RateLimiter::for('auth-passwords', fn (Request $request) => [
            Limit::perMinute(3)->by(mb_strtolower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        RateLimiter::for('auth-token', fn (Request $request) => Limit::perMinute(120)->by(
            optional($request->user())->getAuthIdentifier() ?: $request->ip()
        ));

        RateLimiter::for('admin-api', fn (Request $request) => Limit::perMinute(300)->by(
            optional($request->user())->getAuthIdentifier() ?: $request->ip()
        ));

        RateLimiter::for('public-settings', fn (Request $request) => Limit::perMinute(300)->by($request->ip()));

        RateLimiter::for('search', fn (Request $request) => [
            Limit::perMinute(120)->by(optional($request->user())->getAuthIdentifier() ?: $request->ip()),
            Limit::perHour(1500)->by($request->ip()),
        ]);

        RateLimiter::for('search-write', fn (Request $request) => [
            Limit::perMinute(60)->by(optional($request->user())->getAuthIdentifier() ?: $request->ip()),
            Limit::perHour(500)->by($request->ip()),
        ]);

        RateLimiter::for('product-feedback', fn (Request $request) => [
            Limit::perMinute(5)->by(
                'feedback:'.(optional($request->user())->getAuthIdentifier() ?: hash('sha256', $request->ip().'|'.(string) $request->userAgent()))
            ),
            Limit::perHour(30)->by('feedback-ip:'.$request->ip()),
        ]);

        RateLimiter::for('order-tracking', fn (Request $request) => [
            Limit::perMinute(10)->by(hash('sha256', mb_strtoupper((string) $request->input('order_id')).'|'.$request->ip())),
            Limit::perMinute(30)->by($request->ip()),
        ]);

        RateLimiter::for('checkout-otp', fn (Request $request) => [
            Limit::perMinute(5)->by(hash('sha256', (string) $request->input('mobile').'|'.$request->ip())),
            Limit::perHour(30)->by($request->ip()),
        ]);

        RateLimiter::for('checkout-otp-verify', fn (Request $request) => [
            Limit::perMinute(10)->by(hash('sha256', (string) $request->input('challenge_id').'|'.$request->ip())),
            Limit::perHour(100)->by($request->ip()),
        ]);
    }
}
