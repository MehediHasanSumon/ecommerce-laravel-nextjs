<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductCardResource;
use App\Http\Responses\ApiResponse;
use App\Models\Cart;
use App\Models\CustomerNotification;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Wishlist;
use App\Services\Notifications\NotificationPayloadFormatter;
use App\Services\ProductFeedbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AccountController extends Controller
{
    public function __construct(
        private readonly NotificationPayloadFormatter $notificationFormatter,
        private readonly ProductFeedbackService $feedback,
    ) {}

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
            ->withSellableVariantMetrics()
            ->whereSellableAvailable()
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
            'gender' => ['nullable', Rule::in(['male', 'female', 'other', 'prefer_not_to_say'])],
        ]);
        $request->user()->update($data);

        return ApiResponse::success(['profile' => $this->profilePayload($request->user()->fresh())], 'Profile updated successfully.');
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();
        $oldAvatar = $user->avatar;
        $path = $data['avatar']->store('avatars', 'public');
        $user->update(['avatar' => Storage::disk('public')->url($path)]);

        $this->deleteOldAvatar($oldAvatar);

        return ApiResponse::success(['profile' => $this->profilePayload($user->fresh())], 'Profile picture updated successfully.');
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(6)],
        ]);
        abort_unless(Hash::check($data['current_password'], $request->user()->password), 422, 'Current password is incorrect.');
        $request->user()->update(['password' => $data['password']]);

        return ApiResponse::success([], 'Password changed successfully.');
    }

    public function notifications(Request $request): JsonResponse
    {
        $data = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['all', 'read', 'unread'])],
            'type' => ['nullable', 'string', 'max:60'],
        ]);
        $query = CustomerNotification::query()
            ->where('user_id', $request->user()->id)
            ->when($data['search'] ?? null, fn ($query, string $search) => $query->where(fn ($inner) => $inner
                ->where('title', 'like', "%{$search}%")
                ->orWhere('message', 'like', "%{$search}%")))
            ->when(($data['status'] ?? 'all') === 'read', fn ($query) => $query->whereNotNull('read_at'))
            ->when(($data['status'] ?? 'all') === 'unread', fn ($query) => $query->whereNull('read_at'))
            ->when($data['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
            ->latest();

        $notifications = $query->paginate((int) ($data['per_page'] ?? 10));

        return ApiResponse::success([
            'items' => $notifications->getCollection()->map(fn (CustomerNotification $item) => $this->notificationFormatter->format($item))->values(),
            'unreadCount' => CustomerNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->count(),
        ], meta: ['pagination' => $this->paginationMeta($notifications)]);
    }

    public function unreadNotificationCount(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'unreadCount' => CustomerNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->count(),
        ]);
    }

    public function markNotificationRead(Request $request, CustomerNotification $notification): JsonResponse
    {
        abort_unless((int) $notification->user_id === (int) $request->user()->id, 404);

        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return ApiResponse::success([
            'notification' => $this->notificationFormatter->format($notification->fresh()),
            'unreadCount' => CustomerNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->count(),
        ], 'Notification marked as read.');
    }

    public function markNotificationsRead(Request $request): JsonResponse
    {
        CustomerNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return ApiResponse::success([], 'Notifications marked as read.');
    }

    public function deleteNotification(Request $request, CustomerNotification $notification): JsonResponse
    {
        abort_unless((int) $notification->user_id === (int) $request->user()->id, 404);

        $notification->delete();

        return ApiResponse::success([], 'Notification deleted successfully.');
    }

    public function bulkDeleteNotifications(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['required', 'integer'],
        ]);

        $deleted = CustomerNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', $data['ids'])
            ->delete();

        return ApiResponse::success([
            'deleted' => $deleted,
            'unreadCount' => CustomerNotification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->count(),
        ], 'Notifications deleted successfully.');
    }

    public function reviews(Request $request): JsonResponse
    {
        $reviews = ProductReview::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'product' => fn ($query) => $query
                    ->withSellableVariantMetrics()
                    ->with(['category:id,name,slug', 'brand:id,name,slug', 'images', 'tags']),
            ])
            ->latest()
            ->paginate(10);

        return ApiResponse::success([
            'items' => $reviews->map(fn (ProductReview $review): array => $this->reviewPayload($review))->values(),
        ], meta: ['pagination' => $this->paginationMeta($reviews)]);
    }

    public function updateReview(Request $request, ProductReview $review): JsonResponse
    {
        abort_unless((int) $review->user_id === (int) $request->user()->id, 404);

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        $review = $this->feedback->updateReview($review, $request, $data);
        $message = $review->status === 'approved'
            ? 'Review updated successfully.'
            : 'Review updated successfully. It will appear publicly after approval.';

        return ApiResponse::success([
            'review' => $this->reviewPayload($review->fresh([
                'product' => fn ($query) => $query
                    ->withSellableVariantMetrics()
                    ->with(['category:id,name,slug', 'brand:id,name,slug', 'images', 'tags']),
            ])),
        ], $message);
    }

    public function deleteReview(Request $request, ProductReview $review): JsonResponse
    {
        abort_unless((int) $review->user_id === (int) $request->user()->id, 404);

        $review->delete();

        return ApiResponse::success([], 'Review deleted successfully.');
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
            'avatar' => $this->avatarUrl($user->avatar),
            'memberSince' => optional($user->created_at)->toISOString(),
            'membershipLevel' => 'Member',
            'profileCompletion' => $this->profileCompletion($user),
        ];
    }

    private function reviewPayload(ProductReview $review): array
    {
        return [
            'id' => $review->id,
            'rating' => $review->rating,
            'comment' => $review->comment,
            'verified' => (bool) $review->is_verified_purchase,
            'status' => $review->status,
            'canEdit' => $this->feedback->canEditReview($review),
            'createdAt' => optional($review->created_at)->toISOString(),
            'replies' => $review->admin_reply ? [[
                'id' => 'admin-'.$review->id,
                'author' => 'Store',
                'comment' => $review->admin_reply,
                'createdAt' => optional($review->admin_replied_at ?: $review->updated_at)->toISOString(),
            ]] : [],
            'product' => $review->product ? ProductCardResource::make($review->product)->resolve() : null,
        ];
    }

    private function profileCompletion($user): int
    {
        $fields = ['name', 'email', 'phone', 'date_of_birth', 'gender', 'avatar'];
        $completed = collect($fields)->filter(fn (string $field): bool => filled($user->{$field}))->count();

        return (int) round(($completed / count($fields)) * 100);
    }

    private function deleteOldAvatar(?string $avatar): void
    {
        if (! $avatar || ! str_contains($avatar, '/storage/avatars/')) {
            return;
        }

        $path = ltrim((string) parse_url($avatar, PHP_URL_PATH), '/');
        if (str_starts_with($path, 'storage/')) {
            Storage::disk('public')->delete(substr($path, strlen('storage/')));
        }
    }

    private function avatarUrl(?string $avatar): ?string
    {
        if (! $avatar) {
            return null;
        }

        if (str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')) {
            return $avatar;
        }

        if (str_starts_with($avatar, '/storage/') || str_starts_with($avatar, 'storage/')) {
            return url($avatar);
        }

        return url(Storage::disk('public')->url($avatar));
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
