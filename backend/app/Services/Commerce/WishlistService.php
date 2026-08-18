<?php

namespace App\Services\Commerce;

use App\Models\User;
use App\Models\Wishlist;
use App\Support\GuestToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WishlistService
{
    public function __construct(
        private readonly ProductSelectionService $selectionService,
    ) {}

    public function get(Request $request): Wishlist
    {
        return $this->resolveWishlist($request, true)->load([
            'items.product' => fn ($query) => $query
                ->withSellableVariantMetrics()
                ->with([
                    'brand:id,name,slug',
                    'category:id,name,slug',
                    'images:id,product_id,url,is_primary,sort_order',
                    'tags:id,name',
                    'collections:id',
                    'primaryActiveVariant',
                ]),
        ]);
    }

    public function toggle(Request $request, int $productId): Wishlist
    {
        $wishlist = $this->resolveWishlist($request, true);
        $product = $this->selectionService->wishlistProduct($productId);

        $existing = $wishlist->items()->where('product_id', $product->id)->first();
        if ($existing) {
            $existing->delete();
        } else {
            $wishlist->items()->create(['product_id' => $product->id]);
        }

        return $this->get($request);
    }

    public function remove(Request $request, int $itemId): Wishlist
    {
        $wishlist = $this->resolveWishlist($request, true);
        $wishlist->items()->whereKey($itemId)->delete();

        return $this->get($request);
    }

    public function clear(Request $request): Wishlist
    {
        $wishlist = $this->resolveWishlist($request, true);
        $wishlist->items()->delete();

        return $this->get($request);
    }

    public function merge(Request $request, User $user): Wishlist
    {
        $guestToken = GuestToken::fromRequest($request);
        $userWishlist = Wishlist::query()->firstOrCreate(['user_id' => $user->id]);

        if (! $guestToken) {
            return $this->get($request);
        }

        $guestWishlist = Wishlist::query()->where('guest_token', $guestToken)->first();
        if (! $guestWishlist || $guestWishlist->id === $userWishlist->id) {
            return $this->get($request);
        }

        DB::transaction(function () use ($guestWishlist, $userWishlist): void {
            $productIds = $userWishlist->items()->pluck('product_id');
            $guestWishlist->items()
                ->whereNotIn('product_id', $productIds)
                ->get()
                ->each(fn ($item) => $item->update(['wishlist_id' => $userWishlist->id]));

            $guestWishlist->delete();
        });

        return $this->get($request);
    }

    private function resolveWishlist(Request $request, bool $create): Wishlist
    {
        $user = $request->user();
        $query = Wishlist::query();

        if ($user) {
            $query->where('user_id', $user->id);
        } else {
            $query->where('guest_token', GuestToken::required($request));
        }

        if ($create) {
            return $query->firstOrCreate($user
                ? ['user_id' => $user->id]
                : ['guest_token' => GuestToken::required($request)]);
        }

        return $query->firstOrFail();
    }
}
