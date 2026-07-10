<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Responses\ApiResponse;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NewsletterSubscriptionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email:rfc', 'max:190'],
        ]);

        $email = mb_strtolower(trim($data['email']));
        $existing = NewsletterSubscriber::query()->where('email', $email)->first();

        if ($existing && $existing->status === 'subscribed') {
            return ApiResponse::success([
                'subscriber' => [
                    'id' => $existing->id,
                    'email' => $existing->email,
                    'status' => $existing->status,
                ],
            ], 'You are already subscribed.');
        }

        $subscriber = NewsletterSubscriber::query()->updateOrCreate(
            ['email' => $email],
            [
                'status' => 'subscribed',
                'subscribed_at' => now(),
                'unsubscribed_at' => null,
                'client_ip' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 2000),
            ],
        );

        Log::info('Newsletter subscriber saved.', [
            'newsletter_subscriber_id' => $subscriber->id,
            'email' => $subscriber->email,
        ]);

        return ApiResponse::success([
            'subscriber' => [
                'id' => $subscriber->id,
                'email' => $subscriber->email,
                'status' => $subscriber->status,
            ],
        ], 'Subscription successful.', 201);
    }
}
