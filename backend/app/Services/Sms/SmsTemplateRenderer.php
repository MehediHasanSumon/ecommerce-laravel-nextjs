<?php

namespace App\Services\Sms;

use App\Models\SmsTemplate;

class SmsTemplateRenderer
{
    public function render(string $event, array $context): ?string
    {
        $template = SmsTemplate::query()->where('event', $event)->where('enabled', true)->first();
        if (! $template) {
            return null;
        }

        return preg_replace_callback('/\{([a-z_]+)\}/', function (array $match) use ($context): string {
            return (string) ($context[$match[1]] ?? '');
        }, $template->body);
    }
}
