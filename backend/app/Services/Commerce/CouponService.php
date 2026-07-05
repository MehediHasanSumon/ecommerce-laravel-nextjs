<?php

namespace App\Services\Commerce;

use App\Models\Cart;
use App\Models\Discount;
use App\Models\Settings\ShippingMethod;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CouponService
{
    public function estimateShippingCents(): int
    {
        return (int) cache()->remember(
            'storefront.shipping-methods.estimated-default',
            now()->addMinutes(10),
            fn () => (int) ShippingMethod::query()
                ->where('status', true)
                ->orderBy('display_order')
                ->orderBy('id')
                ->value('rate_cents')
        );
    }

    public function apply(Cart $cart, string $code): array
    {
        $coupon = Discount::query()
            ->with([
                'products:id',
                'categories:id',
                'brands:id',
                'excludedProducts:id',
                'excludedCategories:id',
                'usages:id,discount_id,user_id,usage_count,last_used_at',
            ])
            ->whereRaw('LOWER(code) = ?', [mb_strtolower(trim($code))])
            ->first();

        if (! $coupon) {
            throw ValidationException::withMessages(['code' => 'Invalid coupon code.']);
        }

        if ($cart->coupon_code && strcasecmp((string) $cart->coupon_code, (string) $coupon->code) === 0) {
            throw ValidationException::withMessages(['code' => 'Coupon already applied.']);
        }

        $summary = $this->validateAndSummarize($cart, $coupon);

        return $this->persistCoupon($cart, $coupon, $summary);
    }

    public function remove(Cart $cart, string $message = 'Coupon removed successfully.'): array
    {
        $cart->update([
            'coupon_code' => null,
            'coupon_discount_id' => null,
            'coupon_discount_cents' => 0,
            'coupon_snapshot' => null,
        ]);

        return [
            'message' => $message,
            'type' => 'info',
            'removed' => true,
        ];
    }

    public function revalidate(Cart $cart): ?array
    {
        if (! $cart->coupon_code) {
            return null;
        }

        $coupon = Discount::query()
            ->with([
                'products:id',
                'categories:id',
                'brands:id',
                'excludedProducts:id',
                'excludedCategories:id',
                'usages:id,discount_id,user_id,usage_count,last_used_at',
            ])
            ->find($cart->coupon_discount_id);

        if (! $coupon || ! $coupon->code) {
            return $this->remove($cart, 'The applied coupon is no longer available.');
        }

        try {
            $summary = $this->validateAndSummarize($cart, $coupon);
            $result = $this->persistCoupon($cart, $coupon, $summary);

            return $result['changed'] ? $result : null;
        } catch (ValidationException $exception) {
            return $this->remove($cart, collect($exception->errors())->flatten()->first() ?: 'The applied coupon is no longer valid.');
        }
    }

    public function snapshotSummary(Cart $cart): array
    {
        $snapshot = (array) ($cart->coupon_snapshot ?? []);

        return [
            'code' => $cart->coupon_code,
            'discount_cents' => (int) ($cart->coupon_discount_cents ?? 0),
            'shipping_discount_cents' => (int) ($snapshot['shipping_discount_cents'] ?? 0),
            'free_shipping' => (bool) ($snapshot['free_shipping'] ?? false),
            'name' => $snapshot['name'] ?? null,
        ];
    }

    public function incrementUsageForAppliedCoupon(Cart $cart): void
    {
        if (! $cart->coupon_discount_id) {
            return;
        }

        DB::transaction(function () use ($cart): void {
            $coupon = Discount::query()->lockForUpdate()->find($cart->coupon_discount_id);
            if (! $coupon) {
                return;
            }

            $coupon->increment('total_used');

            if ($cart->user_id) {
                $coupon->usages()->updateOrCreate(
                    ['user_id' => $cart->user_id],
                    [
                        'usage_count' => DB::raw('usage_count + 1'),
                        'last_used_at' => now(),
                    ]
                );
            }
        });
    }

    private function validateAndSummarize(Cart $cart, Discount $coupon): array
    {
        $now = CarbonImmutable::now();

        if ($coupon->status !== 'active') {
            throw ValidationException::withMessages(['code' => 'Coupon is inactive.']);
        }
        if (! $coupon->code) {
            throw ValidationException::withMessages(['code' => 'Invalid coupon code.']);
        }
        if ($coupon->starts_at && $now->lt(CarbonImmutable::instance($coupon->starts_at))) {
            throw ValidationException::withMessages(['code' => 'Coupon is not active yet.']);
        }
        if ($coupon->ends_at && $now->gt(CarbonImmutable::instance($coupon->ends_at))) {
            throw ValidationException::withMessages(['code' => 'Coupon has expired.']);
        }
        if ($coupon->usage_limit !== null && (int) $coupon->total_used >= (int) $coupon->usage_limit) {
            throw ValidationException::withMessages(['code' => 'Coupon usage limit exceeded.']);
        }

        $cart->loadMissing(['items.product:id,brand_id,category_id,status', 'user']);

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages(['code' => 'Add products to the cart before applying a coupon.']);
        }

        if ($coupon->first_order_only && $cart->user_id) {
            $hasPreviousCompletedFlow = Cart::query()
                ->where('user_id', $cart->user_id)
                ->where('id', '!=', $cart->id)
                ->where('status', '!=', 'active')
                ->exists();

            if ($hasPreviousCompletedFlow) {
                throw ValidationException::withMessages(['code' => 'This coupon is available for first orders only.']);
            }
        }

        if ($coupon->usage_per_customer !== null && $cart->user_id) {
            $usedCount = (int) optional($coupon->usages->firstWhere('user_id', $cart->user_id))->usage_count;
            if ($usedCount >= (int) $coupon->usage_per_customer) {
                throw ValidationException::withMessages(['code' => 'You have already used this coupon the maximum number of times.']);
            }
        }

        $subtotalCents = (int) $cart->items->sum('line_subtotal_cents');
        $itemDiscountCents = (int) $cart->items->sum('line_discount_cents');
        $netMerchandiseCents = max(0, $subtotalCents - $itemDiscountCents);

        if ($coupon->minimum_order_amount !== null && $netMerchandiseCents < (int) $coupon->minimum_order_amount) {
            throw ValidationException::withMessages(['code' => 'Minimum order amount not reached.']);
        }

        $eligibleSubtotalCents = $this->eligibleSubtotalCents($cart, $coupon);
        if ($eligibleSubtotalCents <= 0) {
            throw ValidationException::withMessages(['code' => 'Coupon is not applicable to selected products.']);
        }

        $couponDiscountCents = $this->calculateDiscountCents($coupon, $eligibleSubtotalCents);
        if ($couponDiscountCents <= 0 && ! $coupon->free_shipping) {
            throw ValidationException::withMessages(['code' => 'Coupon is not applicable to selected products.']);
        }

        $shippingCents = $this->estimateShippingCents();
        $shippingDiscountCents = $coupon->free_shipping ? $shippingCents : 0;

        return [
            'subtotal_cents' => $subtotalCents,
            'item_discount_cents' => $itemDiscountCents,
            'coupon_discount_cents' => $couponDiscountCents,
            'shipping_cents' => $shippingCents,
            'shipping_discount_cents' => $shippingDiscountCents,
            'free_shipping' => (bool) $coupon->free_shipping,
        ];
    }

    private function eligibleSubtotalCents(Cart $cart, Discount $coupon): int
    {
        $productIds = $coupon->products->pluck('id')->map(fn ($id) => (int) $id)->all();
        $categoryIds = $coupon->categories->pluck('id')->map(fn ($id) => (int) $id)->all();
        $brandIds = $coupon->brands->pluck('id')->map(fn ($id) => (int) $id)->all();
        $excludedProductIds = $coupon->excludedProducts->pluck('id')->map(fn ($id) => (int) $id)->all();
        $excludedCategoryIds = $coupon->excludedCategories->pluck('id')->map(fn ($id) => (int) $id)->all();

        return (int) $cart->items->sum(function ($item) use ($productIds, $categoryIds, $brandIds, $excludedProductIds, $excludedCategoryIds): int {
            $product = $item->product;
            if (! $product || $product->status !== 'active') {
                return 0;
            }

            if (in_array((int) $product->id, $excludedProductIds, true)) {
                return 0;
            }

            if (in_array((int) $product->category_id, $excludedCategoryIds, true)) {
                return 0;
            }

            $matches = empty($productIds) && empty($categoryIds) && empty($brandIds);
            $matches = $matches
                || in_array((int) $product->id, $productIds, true)
                || in_array((int) $product->category_id, $categoryIds, true)
                || in_array((int) $product->brand_id, $brandIds, true);

            if (! $matches) {
                return 0;
            }

            return max(0, (int) $item->line_subtotal_cents - (int) $item->line_discount_cents);
        });
    }

    private function calculateDiscountCents(Discount $coupon, int $eligibleSubtotalCents): int
    {
        $discount = $coupon->type === 'percentage'
            ? (int) floor($eligibleSubtotalCents * (((int) $coupon->value) / 100))
            : (int) $coupon->value;

        if ($coupon->maximum_discount !== null) {
            $discount = min($discount, (int) $coupon->maximum_discount);
        }

        return max(0, min($discount, $eligibleSubtotalCents));
    }

    private function persistCoupon(Cart $cart, Discount $coupon, array $summary): array
    {
        $current = $this->snapshotSummary($cart);
        $changed = $current['code'] !== $coupon->code
            || $current['discount_cents'] !== $summary['coupon_discount_cents']
            || $current['shipping_discount_cents'] !== $summary['shipping_discount_cents']
            || $current['free_shipping'] !== $summary['free_shipping'];

        $snapshot = [
            'name' => $coupon->name,
            'type' => $coupon->type,
            'value' => (int) $coupon->value,
            'free_shipping' => (bool) $coupon->free_shipping,
            'shipping_discount_cents' => (int) $summary['shipping_discount_cents'],
            'applied_at' => now()->toISOString(),
        ];

        $cart->update([
            'coupon_code' => $coupon->code,
            'coupon_discount_id' => $coupon->id,
            'coupon_discount_cents' => (int) $summary['coupon_discount_cents'],
            'coupon_snapshot' => $snapshot,
        ]);

        return [
            'message' => sprintf('%s coupon applied.', $coupon->code),
            'type' => 'success',
            'changed' => $changed,
        ];
    }
}
