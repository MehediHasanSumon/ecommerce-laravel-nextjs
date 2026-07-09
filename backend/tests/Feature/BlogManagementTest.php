<?php

use App\Models\Blog;
use App\Models\Settings\BlogSetting;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
});

function blogAdminAccessToken(): string
{
    return User::factory()
        ->create()
        ->createToken('access-token', ['access'], now()->addMinutes(15))
        ->plainTextToken;
}

it('hides public blog APIs and runtime navigation when disabled', function () {
    BlogSetting::query()->create(['enabled' => false]);

    $this->getJson('/api/blogs')->assertNotFound();
    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.module_settings.blog', false)
        ->assertJsonMissing(['href' => '/blogs']);
});

it('manages blog settings and exposes runtime navigation when enabled', function () {
    $token = blogAdminAccessToken();

    $this->withToken($token)->putJson('/api/admin/settings/blog', [
        'enabled' => true,
        'layout' => 'list',
        'list_enable_thumbnail' => true,
        'list_show_excerpt' => true,
        'list_show_author' => true,
        'list_show_published_date' => true,
        'list_show_reading_time' => true,
        'show_on_home' => true,
        'home_limit' => 4,
        'allow_comments' => true,
        'enable_related' => true,
        'enable_search' => true,
        'default_meta_title' => 'Journal',
        'default_meta_description' => 'Latest stories',
        'open_graph_image' => null,
        'canonical_url' => null,
    ])->assertOk()
        ->assertJsonPath('data.settings.enabled', true)
        ->assertJsonPath('data.settings.layout', 'list');

    $this->getJson('/api/settings/navigation')
        ->assertOk()
        ->assertJsonPath('data.module_settings.blog', true)
        ->assertJsonPath('data.blog_settings.layout', 'list')
        ->assertJsonFragment(['href' => '/blogs']);
});

it('creates edits searches paginates and deletes blogs through admin and public APIs', function () {
    $token = blogAdminAccessToken();
    BlogSetting::query()->create(['enabled' => true, 'enable_search' => true]);

    $create = $this->withToken($token)->postJson('/api/admin/blogs', [
        'title' => 'Laravel Ecommerce Playbook',
        'featured_image' => 'https://example.com/blog.jpg',
        'excerpt' => 'A practical ecommerce article.',
        'content' => str_repeat('Laravel commerce content ', 30),
        'status' => 'published',
        'published_at' => now()->subDay()->toISOString(),
        'featured' => true,
    ]);

    $create->assertCreated()
        ->assertJsonPath('data.blog.slug', 'laravel-ecommerce-playbook')
        ->assertJsonPath('data.blog.status', 'published');

    $id = $create->json('data.blog.id');

    $this->withToken($token)->putJson("/api/admin/blogs/{$id}", [
        'title' => 'Updated Laravel Ecommerce Playbook',
        'featured_image' => 'https://example.com/blog.jpg',
        'excerpt' => 'A better article.',
        'content' => 'Updated Laravel search content.',
        'status' => 'published',
        'published_at' => now()->subDay()->toISOString(),
        'featured' => false,
        'allow_comments_override' => true,
    ])->assertOk()
        ->assertJsonPath('data.blog.slug', 'laravel-ecommerce-playbook')
        ->assertJsonPath('data.blog.featured', false);

    $this->getJson('/api/blogs?search=Laravel&page=1')
        ->assertOk()
        ->assertJsonPath('meta.pagination.per_page', 12);

    $this->assertDatabaseHas('blogs', [
        'id' => $id,
        'slug' => 'laravel-ecommerce-playbook',
    ]);

    $this->getJson('/api/blogs/laravel-ecommerce-playbook')
        ->assertOk()
        ->assertJsonPath('data.blog.title', 'Updated Laravel Ecommerce Playbook')
        ->assertJsonStructure(['data' => ['related', 'settings']]);

    $this->withToken($token)->deleteJson("/api/admin/blogs/{$id}")->assertOk();
    $this->assertSoftDeleted('blogs', ['id' => $id]);
});

it('accepts comments only when comments are enabled and keeps them pending moderation', function () {
    BlogSetting::query()->create(['enabled' => true, 'allow_comments' => true]);
    $author = User::factory()->create();
    $blog = Blog::query()->create([
        'author_id' => $author->id,
        'title' => 'Commentable Blog',
        'slug' => 'commentable-blog',
        'featured_image' => 'https://example.com/blog.jpg',
        'excerpt' => 'Excerpt',
        'content' => 'Content',
        'status' => 'published',
        'published_at' => now()->subHour(),
        'reading_time_minutes' => 1,
    ]);

    $this->postJson('/api/blogs/commentable-blog/comments', [
        'author_name' => 'Reader',
        'author_email' => 'reader@example.com',
        'content' => 'Useful article.',
    ])->assertCreated()
        ->assertJsonPath('message', 'Comment submitted for moderation.');

    $this->assertDatabaseHas('blog_comments', [
        'blog_id' => $blog->id,
        'author_email' => 'reader@example.com',
        'status' => 'pending',
    ]);
});
