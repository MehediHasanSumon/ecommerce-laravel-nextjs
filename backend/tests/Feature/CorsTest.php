<?php

it('allows frontend preflight requests to auth endpoints', function () {
    config()->set('cors.allowed_origins', ['https://e.mehedih.dev']);

    $this->options('/api/auth/register', [], [
        'HTTP_ORIGIN' => 'https://e.mehedih.dev',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type,x-requested-with',
    ])
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', 'https://e.mehedih.dev')
        ->assertHeader('Access-Control-Allow-Credentials', 'true');
});
