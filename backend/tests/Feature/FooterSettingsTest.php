<?php

use App\Models\Settings\FooterSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

function footerSettingsAdminToken(): string
{
    return accessTokenWithPermissions([
        'can_view_footer_setting',
        'can_edit_footer_setting',
    ]);
}

it('returns default footer settings for admin', function () {
    $token = footerSettingsAdminToken();

    $this->withToken($token)->getJson('/api/admin/settings/footer')
        ->assertOk()
        ->assertJsonStructure([
            'data' => [
                'id',
                'payment_banner_image',
                'payment_banner_enabled',
                'payment_banner_title',
                'social_links',
            ],
        ]);
});

it('updates footer settings and reflects in public navigation settings', function () {
    $token = footerSettingsAdminToken();

    $this->withToken($token)->putJson('/api/admin/settings/footer', [
        'payment_banner_image' => 'https://example.com/banner.png',
        'payment_banner_enabled' => true,
        'payment_banner_title' => 'Accepted Payment Methods',
        'social_links' => [
            [
                'platform' => 'facebook',
                'url' => 'https://facebook.com/mybrand',
                'icon' => 'facebook',
                'open_in_new_tab' => true,
                'status' => true,
                'display_order' => 0,
            ],
            [
                'platform' => 'instagram',
                'url' => 'https://instagram.com/mybrand',
                'icon' => 'instagram',
                'open_in_new_tab' => true,
                'status' => true,
                'display_order' => 1,
            ],
            [
                'platform' => 'youtube',
                'url' => '',
                'icon' => 'youtube',
                'open_in_new_tab' => true,
                'status' => false,
                'display_order' => 2,
            ],
        ],
    ])->assertOk()
        ->assertJsonPath('data.payment_banner_title', 'Accepted Payment Methods')
        ->assertJsonPath('data.social_links.0.platform', 'facebook');

    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.footer_settings.payment_banner_title', 'Accepted Payment Methods')
        ->assertJsonPath('data.footer_settings.payment_banner_enabled', true)
        ->assertJsonPath('data.footer_settings.social_links.0.platform', 'facebook')
        ->assertJsonPath('data.footer_settings.social_links.0.url', 'https://facebook.com/mybrand');
});

it('uploads payment banner image', function () {
    Storage::fake('public');
    $token = footerSettingsAdminToken();

    $file = UploadedFile::fake()->createWithContent(
        'banner.png',
        base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
    );

    $this->withToken($token)->postJson('/api/admin/settings/footer/upload', [
        'file' => $file,
    ])->assertOk()
        ->assertJsonStructure([
            'data' => ['url'],
        ]);
});
