<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Responses\ApiResponse;
use App\Models\Cart;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AccountController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $wishlist = Wishlist::query()->where('user_id', $user->id)->withCount('items')->first();
        $cart = Cart::query()->where('user_id', $user->id)->where('status', 'active')->withSum('items', 'quantity')->first();
        $orders = Order::query()->where('user_id', $user->id);
        $recentOrders = (clone $orders)->withCount('items')->latest('placed_at')->limit(3)->get();
        $totalSpent = (clone $orders)->where('payment_status', 'paid')->whereNotIn('status', ['cancelled', 'refunded'])->sum('total_cents');
        $suggested = Product::query()
            ->where('status', 'active')
            ->with(['category:id,name,slug', 'brand:id,name,slug', 'images', 'tags'])
            ->withAvg(['reviews as rating_average' => fn ($query) => $query->where('status', 'approved')], 'rating')
            ->withCount(['reviews as review_count' => fn ($query) => $query->where('status', 'approved')])
            ->orderByDesc('is_best_seller')
            ->orderByDesc('is_featured')
            ->latest()
            ->limit(4)
            ->get();

        return ApiResponse::success([
            'profile' => $this->profilePayload($user),
            'stats' => [
                'totalOrders' => (clone $orders)->count(),
                'wishlistCount' => (int) ($wishlist?->items_count ?? 0),
                'cartItems' => (int) ($cart?->items_sum_quantity ?? 0),
                'totalSpent' => round($totalSpent / 100, 2),
                'unreadNotifications' => CustomerNotification::query()->where('user_id', $user->id)->whereNull('read_at')->count(),
                'reviewsCount' => ProductReview::query()->where('user_id', $user->id)->count(),
            ],
            'recentOrders' => OrderResource::collection($recentOrders)->resolve(),
            'suggestedProducts' => ProductCardResource::collection($suggested)->resolve(),
        ]);
    }

    public function profile(Request $request): JsonResponse
    {
        return ApiResponse::success(['profile' => $this->profilePayload($request->user())]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$request->user()->id],
            'phone' => ['nullable', 'string', 'max:40'],
            'date_of_birth' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:30'],
        ]);
        $request->user()->update($data);

        return ApiResponse::success(['profile' => $this->profilePayload($request->user()->fresh())], 'Profile updated successfully.');
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);
        abort_unless(Hash::check($data['current_password'], $request->user()->password), 422, 'Current password is incorrect.');
        $request->user()->update(['password' => $data['password']]);

        return ApiResponse::success([], 'Password changed successfully.');
    }

    public function settings(Request $request): JsonResponse
    {
        return ApiResponse::success(['settings' => $this->settingsPayload($request->user())]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email_notifications' => ['required', 'boolean'],
            'order_updates' => ['required', 'boolean'],
            'promotional_notifications' => ['required', 'boolean'],
            'account_notifications' => ['required', 'boolean'],
        ]);

        $request->user()->update(['account_preferences' => $data]);

        return ApiResponse::success(['settings' => $this->settingsPayload($request->user()->fresh())], 'Account settings saved.');
    }

    public function paymentHistory(Request $request): JsonResponse
    {
        $transactions = PaymentTransaction::query()
            ->whereHas('order', fn ($query) => $query->where('user_id', $request->user()->id))
            ->with('order:id,order_number,total_cents,currency')
            ->latest()
            ->paginate(min((int) $request->query('per_page', 10), 50));

        return ApiResponse::success([
            'items' => $transactions->map(fn ($transaction) => [
                'id' => $transaction->id,
                'orderNumber' => $transaction->order?->order_number,
                'gateway' => $transaction->gateway,
                'status' => $transaction->status,
                'transactionId' => $transaction->gateway_transaction_id,
                'amount' => round($transaction->amount_cents / 100, 2),
                'currency' => $transaction->currency,
                'createdAt' => optional($transaction->created_at)->toISOString(),
            ])->values(),
        ], meta: ['pagination' => $this->paginationMeta($transactions)]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $notifications = CustomerNotification::query()->where('user_id', $request->user()->id)->latest()->paginate(10);

        return ApiResponse::success([
            'items' => $notifications->map(fn ($item) => [
                'id' => $item->id,
                'type' => $item->type,
                'title' => $item->title,
                'message' => $item->message,
                'read' => $item->read_at !== null,
                'createdAt' => optional($item->created_at)->toISOString(),
            ])->values(),
            'unreadCount' => CustomerNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->count(),
        ], meta: ['pagination' => $this->paginationMeta($notifications)]);
    }

    public function markNotificationsRead(Request $request): JsonResponse
    {
        CustomerNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);
        return ApiResponse::success([], 'Notifications marked as read.');
    }

    public function reviews(Request $request): JsonResponse
    {
        $reviews = ProductReview::query()
            ->where('user_id', $request->user()->id)
            ->with(['product.category:id,name,slug', 'product.brand:id,name,slug', 'product.images', 'product.tags'])
            ->latest()
            ->paginate(10);

        return ApiResponse::success([
            'items' => $reviews->map(fn ($review) => [
                'id' => $review->id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'verified' => (bool) $review->is_verified_purchase,
                'status' => $review->status,
                'createdAt' => optional($review->created_at)->toISOString(),
                'replies' => $review->admin_reply ? [[
                    'id' => 'admin-'.$review->id,
                    'author' => 'Store',
                    'comment' => $review->admin_reply,
                    'createdAt' => optional($review->admin_replied_at ?: $review->updated_at)->toISOString(),
                ]] : [],
                'product' => $review->product ? ProductCardResource::make($review->product)->resolve() : null,
            ])->values(),
        ], meta: ['pagination' => $this->paginationMeta($reviews)]);
    }

    private function profilePayload($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'dateOfBirth' => optional($user->date_of_birth)->format('Y-m-d'),
            'gender' => $user->gender,
            'avatar' => $user->avatar,
            'memberSince' => optional($user->created_at)->toISOString(),
            'membershipLevel' => 'Member',
        ];
    }

    private function settingsPayload($user): array
    {
        $defaults = [
            'email_notifications' => true,
            'order_updates' => true,
            'promotional_notifications' => false,
            'account_notifications' => true,
        ];

        return array_merge($defaults, $user->account_preferences ?? []);
    }

    private function paginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }
}
