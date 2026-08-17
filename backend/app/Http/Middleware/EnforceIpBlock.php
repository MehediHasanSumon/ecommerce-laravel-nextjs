<?php

namespace App\Http\Middleware;

use App\Http\Responses\ApiResponse;
use App\Services\Security\IpBlockStateService;
use App\Services\Security\TrustedClientIpResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforceIpBlock
{
    public function __construct(
        private readonly TrustedClientIpResolver $resolver,
        private readonly IpBlockStateService $blocks,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $this->resolver->resolve($request);
        $request->attributes->set('resolved_client_ip', $ip);

        if ($ip === null || ! $this->blocks->isBlocked($ip)) {
            return $next($request);
        }

        if ($request->is('api/*') || $request->expectsJson()) {
            return ApiResponse::error('Your request could not be completed at this time. Please contact support if you believe this is an error.', 403);
        }

        return response()->view('errors.ip-blocked', status: 403);
    }
}
