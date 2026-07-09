<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactMessageResource;
use App\Http\Responses\ApiResponse;
use App\Models\ContactMessage;
use App\Models\Settings\CompanySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactMessageController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:40'],
            'subject' => ['required', 'string', 'max:120'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
        ]);

        $message = ContactMessage::query()->create([
            ...$data,
            'user_id' => $request->user()?->id,
            'client_ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 2000),
        ]);

        $this->notifySupport($message);

        return ApiResponse::success([
            'message' => ContactMessageResource::make($message)->resolve(),
        ], 'Message sent successfully.', 201);
    }

    private function notifySupport(ContactMessage $message): void
    {
        $recipient = CompanySetting::query()->value('support_email');

        if (! $recipient) {
            return;
        }

        try {
            Mail::raw(
                "New contact message\n\nName: {$message->name}\nEmail: {$message->email}\nSubject: {$message->subject}\n\n{$message->message}",
                fn ($mail) => $mail->to($recipient)->subject('New contact message: '.$message->subject)
            );
        } catch (\Throwable $exception) {
            Log::warning('Contact support email notification failed.', [
                'contact_message_id' => $message->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
