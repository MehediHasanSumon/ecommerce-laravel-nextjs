<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdministrator
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $administrator = $user?->roles()->where('name', '!=', 'user')->exists() ?? false;

        return $administrator
            ? $next($request)
            : ApiResponse::error('Administrator access is required.', 403);
    }
}
