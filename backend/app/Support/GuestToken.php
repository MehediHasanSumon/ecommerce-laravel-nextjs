<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GuestToken
{
    public static function fromRequest(Request $request): ?string
    {
        $token = trim((string) $request->header('X-Guest-Token', ''));

        return $token !== '' ? $token : null;
    }

    public static function required(Request $request): string
    {
        $token = self::fromRequest($request);

        if ($token) {
            return $token;
        }

        throw ValidationException::withMessages([
            'guest_token' => ['A guest token is required for guest cart and wishlist requests.'],
        ]);
    }
}
