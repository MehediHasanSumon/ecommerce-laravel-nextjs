<?php

use App\Models\IpAccessRule;
use App\Models\IpBlock;
use App\Models\Settings\SecuritySetting;
use App\Services\Security\IpBlockStateService;
use Illuminate\Support\Facades\Cache;

function ipBlockAdminToken(array $extra = []): string
{
    return accessTokenWithPermissions([
        'can-view-ip-block',
        'can-create-ip-block',
        'can-update-ip-block',
        'can-delete-ip-block',
        ...$extra,
    ]);
}

it('creates lists updates and deletes IPv4 and IPv6 blocks with audit history', function (): void {
    $token = ipBlockAdminToken();

    $ipv4 = $this->withToken($token)->postJson('/api/admin/ip-blocks', [
        'ip_address' => '203.0.113.15',
        'type' => 'manual',
        'status' => 'active',
        'reason' => 'Spam',
        'notes' => 'Repeated spam requests.',
    ])->assertCreated()->json('data.ip_block');

    $ipv6 = $this->withToken($token)->postJson('/api/admin/ip-blocks', [
        'ip_address' => '2001:0db8:0:0:0:0:0:15',
        'type' => 'manual',
        'status' => 'active',
        'reason' => 'API Abuse',
    ])->assertCreated()->assertJsonPath('data.ip_block.ip_address', '2001:db8::15')->json('data.ip_block');

    $this->withToken($token)->getJson('/api/admin/ip-blocks?search=203.0.113.15')
        ->assertOk()
        ->assertJsonCount(1, 'data.ip_blocks');

    $this->withToken($token)->putJson("/api/admin/ip-blocks/{$ipv4['id']}", [
        'type' => 'manual',
        'status' => 'inactive',
        'reason' => 'Spam',
        'notes' => 'Reviewed and released.',
    ])->assertOk()->assertJsonPath('data.ip_block.status', 'inactive');

    $this->withToken($token)->getJson("/api/admin/ip-blocks/{$ipv4['id']}")
        ->assertOk()
        ->assertJsonPath('data.ip_block.events.0.event_type', 'unblocked');

    $this->withToken($token)->deleteJson("/api/admin/ip-blocks/{$ipv6['id']}")->assertOk();

    expect(IpBlock::query()->count())->toBe(1)
        ->and(IpBlock::withTrashed()->count())->toBe(2);
});

it('automatically blocks repeated failed logins using configured thresholds', function (): void {
    SecuritySetting::query()->create([
        'scope' => 'global',
        'auto_blocking_enabled' => true,
        'max_failed_login_attempts' => 2,
        'time_window_minutes' => 10,
        'temporary_block_duration_minutes' => 30,
        'permanent_block_threshold' => 3,
    ]);
    Cache::flush();

    for ($attempt = 0; $attempt < 2; $attempt++) {
        $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.70'])
            ->postJson('/api/auth/login', ['email' => 'missing@example.com', 'password' => 'invalid-password'])
            ->assertUnprocessable();
    }

    expect(IpBlock::query()->where('ip_address', '198.51.100.70')->where('type', 'automatic')->where('status', 'active')->exists())->toBeTrue();
});

it('rejects duplicates localhost invalid IPs and past expiry dates', function (): void {
    $token = ipBlockAdminToken();
    $payload = ['ip_address' => '198.51.100.20', 'type' => 'manual', 'status' => 'active', 'reason' => 'Bot'];

    $this->withToken($token)->postJson('/api/admin/ip-blocks', $payload)->assertCreated();
    $this->withToken($token)->postJson('/api/admin/ip-blocks', $payload)->assertUnprocessable()->assertJsonValidationErrors('ip_address');
    $this->withToken($token)->postJson('/api/admin/ip-blocks', [...$payload, 'ip_address' => '127.0.0.1'])->assertUnprocessable()->assertJsonValidationErrors('ip_address');
    $this->withToken($token)->postJson('/api/admin/ip-blocks', [...$payload, 'ip_address' => 'invalid'])->assertUnprocessable()->assertJsonValidationErrors('ip_address');
    $this->withToken($token)->postJson('/api/admin/ip-blocks', [...$payload, 'ip_address' => '198.51.100.21', 'expires_at' => now()->subMinute()->toISOString()])->assertUnprocessable()->assertJsonValidationErrors('expires_at');
});

it('refreshes block cache and enforces API blocks while whitelist bypasses', function (): void {
    $block = IpBlock::query()->create([
        'ip_address' => '198.51.100.40',
        'ip_version' => 4,
        'type' => 'automatic',
        'status' => 'active',
        'reason' => 'API Abuse',
        'blocked_at' => now(),
        'block_count' => 1,
    ]);
    $state = app(IpBlockStateService::class);
    expect($state->isBlocked($block->ip_address))->toBeTrue();

    $this->withServerVariables(['REMOTE_ADDR' => $block->ip_address])
        ->getJson('/api/settings/navigation')
        ->assertForbidden()
        ->assertJsonPath('message', 'Your request could not be completed at this time. Please contact support if you believe this is an error.');

    IpAccessRule::query()->create(['ip_address' => '198.51.100.40/32', 'rule_type' => 'whitelist']);
    Cache::flush();

    expect($state->isBlocked($block->ip_address))->toBeFalse();
    $this->withServerVariables(['REMOTE_ADDR' => $block->ip_address])
        ->getJson('/api/settings/navigation')
        ->assertOk();
});

it('protects routes with the exact requested permissions and supports bulk actions', function (): void {
    $this->withToken(accessTokenWithPermissions([]))->getJson('/api/admin/ip-blocks')->assertForbidden();
    $token = ipBlockAdminToken();

    $first = IpBlock::query()->create(['ip_address' => '203.0.113.50', 'ip_version' => 4, 'type' => 'manual', 'status' => 'active', 'reason' => 'Spam', 'blocked_at' => now(), 'block_count' => 1]);
    $second = IpBlock::query()->create(['ip_address' => '203.0.113.51', 'ip_version' => 4, 'type' => 'manual', 'status' => 'active', 'reason' => 'Spam', 'blocked_at' => now(), 'block_count' => 1]);

    $this->withToken($token)->postJson('/api/admin/ip-blocks/bulk', [
        'ids' => [$first->id, $second->id],
        'action' => 'unblock',
    ])->assertOk()->assertJsonPath('data.processed', 2);

    expect(IpBlock::query()->where('status', 'inactive')->count())->toBe(2);
});

it('validates and persists security settings access rules and trusted proxies', function (): void {
    $token = ipBlockAdminToken();

    $this->withToken($token)->putJson('/api/admin/settings/security', [
        'auto_blocking_enabled' => true,
        'max_failed_login_attempts' => 4,
        'max_password_reset_attempts' => 5,
        'max_otp_attempts' => 6,
        'max_registration_attempts' => 7,
        'max_api_requests' => 800,
        'max_checkout_requests' => 20,
        'max_contact_submissions' => 10,
        'max_invalid_auth_attempts' => 20,
        'max_payment_failures' => 8,
        'max_not_found_requests' => 40,
        'max_bot_requests' => 120,
        'time_window_minutes' => 10,
        'temporary_block_duration_minutes' => 30,
        'permanent_block_threshold' => 3,
        'whitelist_ips' => ['203.0.113.0/24'],
        'blacklist_ips' => ['198.51.100.0/24'],
        'trusted_proxies' => [['network' => '10.0.0.0/8', 'label' => 'Load balancer']],
    ])->assertOk()
        ->assertJsonPath('data.settings.max_failed_login_attempts', 4)
        ->assertJsonPath('data.whitelist_ips.0', '203.0.113.0/24');
});
