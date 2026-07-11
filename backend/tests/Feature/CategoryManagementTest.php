<?php

use App\Models\Category;
use App\Models\Settings\CategoryDisplaySetting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

beforeEach(function (): void {
    Cache::flush();
    Storage::fake('public');
});

function categoryManagementAdminToken(): string
{
    return User::factory()
        ->create()
        ->createToken('category-management-access-token', ['access'], now()->addMinutes(15))
        ->plainTextToken;
}

function categorySvgUpload(): UploadedFile
{
    return UploadedFile::fake()->createWithContent(
        'bags.svg',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 8h16v12H4z"/></svg>'
    );
}

it('creates categories with an svg icon in home grid and navbar dropdown mode', function (): void {
    CategoryDisplaySetting::query()->create([
        'enable_home_category_section' => true,
        'category_display_mode' => 'home_grid_navbar_dropdown',
    ]);

    $this->withToken(categoryManagementAdminToken())
        ->post('/api/admin/product-management/categories', [
            'name' => 'SVG Bags',
            'description' => 'Category using an uploaded SVG icon.',
            'icon_file' => categorySvgUpload(),
            'show_on_home' => 'true',
            'show_in_navbar' => 'true',
            'is_featured' => 'true',
            'status' => 'active',
        ])
        ->assertCreated()
        ->assertJsonPath('data.item.name', 'SVG Bags');

    $category = Category::query()->where('name', 'SVG Bags')->firstOrFail();

    expect($category->icon)->toContain('categories/icons');
});

it('requires an icon in home grid and navbar dropdown mode', function (): void {
    CategoryDisplaySetting::query()->create([
        'enable_home_category_section' => true,
        'category_display_mode' => 'home_grid_navbar_dropdown',
    ]);

    $this->withToken(categoryManagementAdminToken())
        ->postJson('/api/admin/product-management/categories', [
            'name' => 'Icon Required',
            'status' => 'active',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['icon_file']);
});

it('requires a category image in landing page mode', function (): void {
    CategoryDisplaySetting::query()->create([
        'enable_home_category_section' => true,
        'category_display_mode' => 'landing_page',
    ]);

    $this->withToken(categoryManagementAdminToken())
        ->postJson('/api/admin/product-management/categories', [
            'name' => 'Landing Only',
            'status' => 'active',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['image_file']);
});

it('creates landing page categories with an svg category image', function (): void {
    CategoryDisplaySetting::query()->create([
        'enable_home_category_section' => true,
        'category_display_mode' => 'landing_page',
    ]);

    $this->withToken(categoryManagementAdminToken())
        ->post('/api/admin/product-management/categories', [
            'name' => 'SVG Landing',
            'image_file' => categorySvgUpload(),
            'status' => 'active',
        ])
        ->assertCreated()
        ->assertJsonPath('data.item.name', 'SVG Landing');

    $category = Category::query()->where('name', 'SVG Landing')->firstOrFail();

    expect($category->image_url)->toContain('categories');
});

it('creates navbar dropdown only categories without media uploads', function (): void {
    CategoryDisplaySetting::query()->create([
        'enable_home_category_section' => true,
        'category_display_mode' => 'navbar_dropdown_only',
    ]);

    $this->withToken(categoryManagementAdminToken())
        ->postJson('/api/admin/product-management/categories', [
            'name' => 'Dropdown Text Only',
            'show_in_navbar' => true,
            'status' => 'active',
        ])
        ->assertCreated()
        ->assertJsonPath('data.item.name', 'Dropdown Text Only');
});
