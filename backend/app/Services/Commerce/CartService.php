<?php

namespace App\Services\Commerce;

use App\Models\Cart;
use App\Models\Settings\ShippingMethod;
use App\Models\User;
use App\Support\GuestToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartService
{
    public function __construct(
        private readonly ProductSelectionService $selectionService,
        private readonly CouponService $couponService,
    ) {}

    public function get(Request $request, bool $strictCouponValidation = false): Cart
    {
        $cart = $this->resolveCart($request, create: true);
        $relations = ['items.product.brand:id,name,slug', 'items.product.category:id,name,slug', 'items.product.images:id,product_id,url,is_primary,sort_order', 'items.product.tags:id,name', 'items.variant', 'coupon'];
        $cart->load($relations);
        if ($strictCouponValidation) {
            $this->refreshItems($cart);
        }
        $notice = $this->couponService->revalidate($cart, ! $strictCouponValidation);
        $fresh = $strictCouponValidation || $notice
            ? $cart->fresh($relations)
            : $cart;
        $this->attachCouponNotice($fresh, $notice);

        return $fresh;
    }

    public function add(Request $request, array $payload): Cart
    {
        return DB::transaction(function () use ($request, $payload): Cart {
            $cart = $this->resolveCart($request, create: true);
            $selection = $this->selectionService->resolveCartSelection($payload);

            $existing = $cart->items()->where('item_key', $selection['item_key'])->first();
            $quantity = $selection['quantity'] + ($existing?->quantity ?? 0);

            $selection = $this->selectionService->resolveCartSelection($payload + ['quantity' => $quantity]);

            $cart->items()->updateOrCreate(
                ['item_key' => $selection['item_key']],
                [
                    'product_id' => $selection['product']->id,
                    'product_variant_id' => $selection['variant']?->id,
                    'quantity' => $selection['quantity'],
                    'unit_price_cents' => $selection['unit_price_cents'],
                    'discounted_price_cents' => $selection['discounted_price_cents'],
                    'line_subtotal_cents' => $selection['line_subtotal_cents'],
                    'line_discount_cents' => $selection['line_discount_cents'],
                    'selection_snapshot' => $selection['selection_snapshot'],
                    'pricing_snapshot' => $selection['pricing_snapshot'],
                    'tax_snapshot' => $selection['tax_snapshot'],
                ]
            );

            return $this->get($request);
        });
    }

    public function updateItem(Request $request, int $itemId, int $quantity): Cart
    {
        return DB::transaction(function () use ($request, $itemId, $quantity): Cart {
            $cart = $this->resolveCart($request, create: true);
            $item = $cart->items()->with(['product', 'variant'])->findOrFail($itemId);
            $selection = $this->selectionService->refreshCartItem($item->product, $item->variant, $quantity, (array) $item->selection_snapshot);

            $item->update([
                'quantity' => $selection['quantity'],
                'unit_price_cents' => $selection['unit_price_cents'],
                'discounted_price_cents' => $selection['discounted_price_cents'],
                'line_subtotal_cents' => $selection['line_subtotal_cents'],
                'line_discount_cents' => $selection['line_discount_cents'],
                'selection_snapshot' => $selection['selection_snapshot'],
                'pricing_snapshot' => $selection['pricing_snapshot'],
                'tax_snapshot' => $selection['tax_snapshot'],
            ]);

            return $this->get($request);
        });
    }

    public function removeItem(Request $request, int $itemId): Cart
    {
        $cart = $this->resolveCart($request, create: true);
        $cart->items()->whereKey($itemId)->delete();

        return $this->get($request);
    }

    public function clear(Request $request): Cart
    {
        $cart = $this->resolveCart($request, create: true);
        $cart->items()->delete();
        $this->couponService->remove($cart, 'Coupon removed because the cart was cleared.');

        return $this->get($request);
    }

    public function merge(Request $request, User $user): Cart
    {
        $guestToken = GuestToken::fromRequest($request);
        $userCart = Cart::query()->firstOrCreate(['user_id' => $user->id, 'status' => 'active']);

        if (! $guestToken) {
            return $this->get($request);
        }

        $guestCart = Cart::query()
            ->where('guest_token', $guestToken)
            ->where('status', 'active')
            ->first();

        if (! $guestCart || $guestCart->id === $userCart->id) {
            return $this->get($request);
        }

        DB::transaction(function () use ($guestCart, $userCart): void {
            $guestCart->load('items');

            foreach ($guestCart->items as $item) {
                $existing = $userCart->items()->where('item_key', $item->item_key)->first();

                if ($existing) {
                    $existing->update([
                        'quantity' => $existing->quantity + $item->quantity,
                        'line_subtotal_cents' => $existing->line_subtotal_cents + $item->line_subtotal_cents,
                        'line_discount_cents' => $existing->line_discount_cents + $item->line_discount_cents,
                    ]);
                    $item->delete();

                    continue;
                }

                $item->update(['cart_id' => $userCart->id]);
            }

            if (! $userCart->coupon_code && $guestCart->coupon_code) {
                $userCart->update([
                    'coupon_code' => $guestCart->coupon_code,
                    'coupon_discount_id' => $guestCart->coupon_discount_id,
                    'coupon_discount_cents' => $guestCart->coupon_discount_cents,
                    'coupon_snapshot' => $guestCart->coupon_snapshot,
                ]);
            }

            $guestCart->delete();
        });

        return $this->get($request);
    }

    public function applyCoupon(Request $request, string $code, ?int $shippingMethodId = null): Cart
    {
        return DB::transaction(function () use ($request, $code, $shippingMethodId): Cart {
            $cart = $this->resolveCart($request, create: true);
            $cart->load(['items.product', 'items.variant', 'coupon']);
            $this->refreshItems($cart);
            $shippingCents = $shippingMethodId
                ? ShippingMethod::query()->where('status', true)->whereKey($shippingMethodId)->value('rate_cents')
                : null;
            $notice = $this->couponService->apply($cart, $code, $shippingCents !== null ? (int) $shippingCents : null);
            $cart = $this->get($request);
            $this->attachCouponNotice($cart, $notice);

            return $cart;
        });
    }

    public function removeCoupon(Request $request): Cart
    {
        $cart = $this->resolveCart($request, create: true);
        $notice = $this->couponService->remove($cart);
        $cart = $this->get($request);
        $this->attachCouponNotice($cart, $notice);

        return $cart;
    }

    private function resolveCart(Request $request, bool $create): Cart
    {
        $forceGuest = $request->headers->get('X-Cart-Mode') === 'guest';
        $user = $forceGuest ? null : $request->user();
        $query = Cart::query()->where('status', 'active');

        if ($user) {
            $query->where('user_id', $user->id);
        } else {
            $query->where('guest_token', GuestToken::required($request));
        }

        if ($create) {
            return $query->firstOrCreate($user
                ? ['user_id' => $user->id, 'status' => 'active']
                : ['guest_token' => GuestToken::required($request), 'status' => 'active']);
        }

        return $query->firstOrFail();
    }

    private function refreshItems(Cart $cart): void
    {
        foreach ($cart->items as $item) {
            if (! $item->product) {
                $item->delete();

                continue;
            }

            try {
                $selection = $this->selectionService->refreshCartItem($item->product, $item->variant, $item->quantity, (array) $item->selection_snapshot);
            } catch (\Throwable) {
                continue;
            }

            $item->update([
                'unit_price_cents' => $selection['unit_price_cents'],
                'discounted_price_cents' => $selection['discounted_price_cents'],
                'line_subtotal_cents' => $selection['line_subtotal_cents'],
                'line_discount_cents' => $selection['line_discount_cents'],
                'selection_snapshot' => $selection['selection_snapshot'],
                'pricing_snapshot' => $selection['pricing_snapshot'],
                'tax_snapshot' => $selection['tax_snapshot'],
            ]);
        }
    }

    private function attachCouponNotice(Cart $cart, ?array $notice): void
    {
        if (! $notice) {
            return;
        }

        $cart->setAttribute('coupon_notice', $notice);
    }
}
