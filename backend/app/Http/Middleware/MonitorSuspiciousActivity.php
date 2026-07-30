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

        if (str_starts_with($path, 'api/') && ! str_starts_with($path, 'api/admin/')) {
            $events[] = 'api_request';
        }
        if ($path === 'api/auth/login' && $status >= 400) {
            $events[] = 'failed_login';
        }
        if (in_array($path, ['api/auth/forgot-password', 'api/auth/reset-password'], true)) {
            $events[] = 'password_reset';
        }
        if (str_contains($path, 'mobile-verification')) {
            $events[] = 'otp';
        }
        if ($path === 'api/auth/register') {
            $events[] = 'registration';
        }
        if (str_contains($path, 'checkout')) {
            $events[] = 'checkout';
        }
        if ($path === 'api/contact-messages' && $request->isMethod('post')) {
            $events[] = 'contact_submission';
        }
        if (in_array($status, [401, 403], true)) {
            $events[] = 'invalid_auth';
        }
        if ($status === 404) {
            $events[] = 'not_found';
        }
        if (str_contains($path, 'payment') && $status >= 400) {
            $events[] = 'payment_failure';
        }
        if (UserAgentMetadata::from($request->userAgent())['is_bot']) {
            $events[] = 'bot_request';
        }

        return array_values(array_unique($events));
    }
}
