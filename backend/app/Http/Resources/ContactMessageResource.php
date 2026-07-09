<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'subject' => $this->subject,
            'message' => $this->message,
            'status' => $this->status,
            'admin_note' => $this->admin_note,
            'read_at' => optional($this->read_at)->toISOString(),
            'replied_at' => optional($this->replied_at)->toISOString(),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
            'user' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => (int) $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ] : null),
            'handler' => $this->whenLoaded('handler', fn () => $this->handler ? [
                'id' => (int) $this->handler->id,
                'name' => $this->handler->name,
            ] : null),
        ];
    }
}
