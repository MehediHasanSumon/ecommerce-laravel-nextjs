<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ContactMessageResource;
use App\Http\Responses\ApiResponse;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class ContactMessageManagementController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:can_view_contact_message', only: ['index']),
            new Middleware('permission:can_edit_contact_message', only: ['update']),
            new Middleware('permission:can_delete_contact_message', only: ['destroy']),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['new', 'read', 'replied', 'closed'])],
            'sort' => ['nullable', Rule::in(['name', 'email', 'subject', 'status', 'created_at', 'updated_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $messages = ContactMessage::query()
            ->with(['user:id,name,email', 'handler:id,name'])
            ->when($data['search'] ?? null, fn ($query, string $search) => $query->where(function ($nested) use ($search): void {
                $nested->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%");
            }))
            ->when($data['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderBy($data['sort'] ?? 'created_at', $data['direction'] ?? 'desc')
            ->paginate((int) ($data['per_page'] ?? 10));

        return ApiResponse::success([
            'messages' => ContactMessageResource::collection($messages)->resolve(),
            'stats' => [
                'total' => ContactMessage::query()->count(),
                'new' => ContactMessage::query()->where('status', 'new')->count(),
                'replied' => ContactMessage::query()->where('status', 'replied')->count(),
                'closed' => ContactMessage::query()->where('status', 'closed')->count(),
            ],
        ], 'Contact messages retrieved successfully.', meta: ['pagination' => [
            'current_page' => $messages->currentPage(),
            'last_page' => $messages->lastPage(),
            'per_page' => $messages->perPage(),
            'total' => $messages->total(),
            'from' => $messages->firstItem(),
            'to' => $messages->lastItem(),
        ]]);
    }

    public function update(Request $request, ContactMessage $contactMessage): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['new', 'read', 'replied', 'closed'])],
            'admin_note' => ['nullable', 'string', 'max:5000'],
        ]);

        $contactMessage->update([
            'status' => $data['status'],
            'admin_note' => $data['admin_note'] ?? null,
            'read_at' => in_array($data['status'], ['read', 'replied', 'closed'], true) ? ($contactMessage->read_at ?: now()) : null,
            'replied_at' => $data['status'] === 'replied' ? ($contactMessage->replied_at ?: now()) : $contactMessage->replied_at,
            'handled_by' => $request->user()?->id,
        ]);

        return ApiResponse::success([
            'message' => ContactMessageResource::make($contactMessage->fresh(['user:id,name,email', 'handler:id,name']))->resolve(),
        ], 'Contact message updated successfully.');
    }

    public function destroy(ContactMessage $contactMessage): JsonResponse
    {
        $contactMessage->delete();

        return ApiResponse::success([], 'Contact message deleted successfully.');
    }
}
