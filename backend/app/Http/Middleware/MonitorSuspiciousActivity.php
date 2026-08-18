<?php

namespace App\Http\Middleware;

use App\Services\Security\SecurityAbuseService;
use App\Support\Security\UserAgentMetadata;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class MonitorSuspiciousActivity
{
    public function __construct(private readonly SecurityAbuseService $abuse) {}

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            foreach ($this->events($request, $response) as $event) {
                $this->abuse->record($event, $request, ['status' => $response->getStatusCode()]);
            }
        } catch (Throwable $exception) {
            report($exception);
        }

        return $response;
    }

    private function events(Request $request, Response $response): array
    {
        $path = trim($request->path(), '/');
        $status = $response->getStatusCode();
        $events = [];

        // Auth abuse tracking - only failed attempts contribute to abuse scoring
        if ($path === 'api/auth/login' && $status >= 400) {
            $events[] = 'failed_login';
        }
        if (in_array($path, ['api/auth/forgot-password', 'api/auth/reset-password'], true) && $status >= 400) {
            $events[] = 'password_reset';
        }
        if (str_contains($path, 'mobile-verification') && $status >= 400) {
            $events[] = 'otp';
        }
        if ($path === 'api/auth/register' && $status >= 400) {
            $events[] = 'registration';
        }
        if ($path === 'api/contact-messages' && $request->isMethod('post') && $status >= 400) {
            $events[] = 'contact_submission';
        }
        if (in_array($status, [401, 403], true) && ! str_starts_with($path, 'api/auth/')) {
            $events[] = 'invalid_auth';
        }
        if ($status === 404 && str_starts_with($path, 'api/')) {
            $events[] = 'not_found';
        }
        if (UserAgentMetadata::from($request->userAgent())['is_bot']) {
            $events[] = 'bot_request';
        }

        return array_values(array_unique($events));
    }
}
