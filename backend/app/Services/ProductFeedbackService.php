<?php

namespace App\Services;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductComment;
use App\Models\ProductReview;
use App\Models\User;
use App\Services\Admin\Settings\StoreSettingsService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ProductFeedbackService
{
    public function __construct(private readonly StoreSettingsService $settings) {}

    public function createReview(Product $product, Request $request, array $data): ProductReview
    {
        $settings = $this->settings->get();
        $this->ensureEnabled((bool) $settings->enable_reviews);
        $this->ensureAccess((string) $settings->review_access, $request->user());

        $user = $request->user();
        $identity = $this->identity($request, $user, $data['guest_email'] ?? null);
        $comment = $this->cleanText($data['comment']);
        $status = (bool) $settings->review_moderation_enabled ? 'pending' : 'approved';
        $dedupeKey = (bool) $settings->one_review_per_product
            ? hash('sha256', $identity)
            : null;
        $submissionHash = hash('sha256', implode('|', [
            $identity,
            (string) $data['rating'],
            mb_strtolower($comment),
        ]));

        if ((bool) $settings->one_review_per_product && $user && ProductReview::query()
            ->where('product_id', $product->id)
            ->where('user_id', $user->id)
            ->exists()
        ) {
            throw new ConflictHttpException('You have already submitted this review.');
        }

        try {
            return DB::transaction(function () use (
                $product,
                $data,
                $user,
                $comment,
                $status,
                $dedupeKey,
                $submissionHash
            ): ProductReview {
                return ProductReview::query()->create([
                    'product_id' => $product->id,
                    'user_id' => $user?->id,
                    'guest_name' => $user ? null : $this->nullableText($data['guest_name'] ?? null),
                    'guest_email' => $user ? null : $this->nullableEmail($data['guest_email'] ?? null),
                    'dedupe_key' => $dedupeKey,
                    'submission_hash' => $submissionHash,
                    'rating' => (int) $data['rating'],
                    'comment' => $comment,
                    'is_verified_purchase' => $user ? $this->isVerifiedPurchase($product, $user) : false,
                    'status' => $status,
                    'approved_at' => $status === 'approved' ? now() : null,
                ]);
            }, 3);
        } catch (QueryException $exception) {
            if ($this->isUniqueViolation($exception)) {
                throw new ConflictHttpException('You have already submitted this review.');
            }

            throw $exception;
        }
    }

    public function createComment(Product $product, Request $request, array $data): ProductComment
    {
        $settings = $this->settings->get();
        $this->ensureEnabled((bool) $settings->enable_product_comments);
        $this->ensureAccess((string) $settings->comment_access, $request->user());

        $user = $request->user();
        $identity = $this->identity($request, $user, $data['guest_email'] ?? null);
        $content = $this->cleanText($data['content']);
        $status = (bool) $settings->comment_moderation_enabled ? 'pending' : 'approved';
        $submissionHash = hash('sha256', $identity.'|'.mb_strtolower($content));

        try {
            return DB::transaction(fn (): ProductComment => ProductComment::query()->create([
                'product_id' => $product->id,
                'user_id' => $user?->id,
                'guest_name' => $user ? null : $this->nullableText($data['guest_name'] ?? null),
                'guest_email' => $user ? null : $this->nullableEmail($data['guest_email'] ?? null),
                'content' => $content,
                'submission_hash' => $submissionHash,
                'status' => $status,
                'approved_at' => $status === 'approved' ? now() : null,
            ]), 3);
        } catch (QueryException $exception) {
            if ($this->isUniqueViolation($exception)) {
                throw new ConflictHttpException('You have already submitted this comment.');
            }

            throw $exception;
        }
    }

    public function updateReview(ProductReview $review, Request $request, array $data): ProductReview
    {
        abort_unless($request->user() && $review->user_id === $request->user()->id, 404);

        $settings = $this->settings->get();
        $this->ensureEnabled((bool) $settings->enable_reviews);

        if (! (bool) $settings->review_editing_enabled || ! $this->withinEditWindow(
            $review->created_at,
            (int) $settings->review_edit_time_limit_minutes
        )) {
            throw new AccessDeniedHttpException('This review can no longer be edited.');
        }

        $comment = $this->cleanText($data['comment']);
        $status = (bool) $settings->review_moderation_enabled ? 'pending' : 'approved';
        $submissionHash = hash('sha256', implode('|', [
            'user:'.$request->user()->id,
            (string) $data['rating'],
            mb_strtolower($comment),
            'edit',
            (string) $review->id,
        ]));

        try {
            $review->forceFill([
                'rating' => (int) $data['rating'],
                'comment' => $comment,
                'submission_hash' => $submissionHash,
                'status' => $status,
                'approved_at' => $status === 'approved' ? now() : null,
                'approved_by' => null,
                'edited_at' => now(),
            ])->save();
        } catch (QueryException $exception) {
            if ($this->isUniqueViolation($exception)) {
                throw new ConflictHttpException('This review duplicates an existing submission.');
            }

            throw $exception;
        }

        return $review->fresh();
    }

    public function updateComment(Product $product, ProductComment $comment, Request $request, array $data): ProductComment
    {
        abort_unless($comment->product_id === $product->id, 404);
        abort_unless($request->user() && $comment->user_id === $request->user()->id, 404);

        $settings = $this->settings->get();
        if (! (bool) $settings->comment_editing_enabled || ! $this->withinEditWindow(
            $comment->created_at,
            (int) $settings->comment_edit_time_limit_minutes
        )) {
            throw new AccessDeniedHttpException('This comment can no longer be edited.');
        }

        $content = $this->cleanText($data['content']);
        $identity = $this->identity($request, $request->user(), null);
        $status = (bool) $settings->comment_moderation_enabled ? 'pending' : 'approved';

        try {
            $comment->forceFill([
                'content' => $content,
                'submission_hash' => hash('sha256', $identity.'|'.mb_strtolower($content).'|edit|'.$comment->id),
                'status' => $status,
                'approved_at' => $status === 'approved' ? now() : null,
                'approved_by' => null,
                'edited_at' => now(),
            ])->save();
        } catch (QueryException $exception) {
            if ($this->isUniqueViolation($exception)) {
                throw new ConflictHttpException('This comment duplicates an existing submission.');
            }

            throw $exception;
        }

        return $comment->fresh(['user:id,name,avatar']);
    }

    public function canEditReview(ProductReview $review): bool
    {
        $settings = $this->settings->get();

        return (bool) $settings->review_editing_enabled
            && $this->withinEditWindow($review->created_at, (int) $settings->review_edit_time_limit_minutes);
    }

    public function canEditComment(ProductComment $comment): bool
    {
        $settings = $this->settings->get();

        return (bool) $settings->comment_editing_enabled
            && $this->withinEditWindow($comment->created_at, (int) $settings->comment_edit_time_limit_minutes);
    }

    private function ensureEnabled(bool $enabled): void
    {
        if (! $enabled) {
            throw new NotFoundHttpException;
        }
    }

    private function ensureAccess(string $access, ?User $user): void
    {
        if ($access === 'registered' && ! $user) {
            throw new AccessDeniedHttpException('Please sign in to submit feedback.');
        }
    }

    private function identity(Request $request, ?User $user, ?string $guestEmail): string
    {
        if ($user) {
            return 'user:'.$user->id;
        }

        $email = $this->nullableEmail($guestEmail);
        if ($email) {
            return 'guest-email:'.$email;
        }

        return 'guest-network:'.hash('sha256', $request->ip().'|'.(string) $request->userAgent());
    }

    private function isVerifiedPurchase(Product $product, User $user): bool
    {
        return OrderItem::query()
            ->where('product_id', $product->id)
            ->whereHas('order', function ($query) use ($user): void {
                $query
                    ->where('user_id', $user->id)
                    ->where('payment_status', 'paid');
            })
            ->exists();
    }

    private function withinEditWindow($createdAt, int $minutes): bool
    {
        return $minutes === 0 || ($createdAt && $createdAt->copy()->addMinutes($minutes)->isFuture());
    }

    private function cleanText(mixed $value): string
    {
        return preg_replace('/\s+/u', ' ', trim(strip_tags((string) $value))) ?? '';
    }

    private function nullableText(mixed $value): ?string
    {
        $value = $this->cleanText($value);

        return $value !== '' ? $value : null;
    }

    private function nullableEmail(mixed $value): ?string
    {
        $value = mb_strtolower(trim((string) $value));

        return $value !== '' ? $value : null;
    }

    private function isUniqueViolation(QueryException $exception): bool
    {
        return in_array((string) ($exception->errorInfo[0] ?? $exception->getCode()), ['23000', '23505'], true);
    }
}
