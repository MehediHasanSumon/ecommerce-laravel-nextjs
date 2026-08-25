<?php

namespace Database\Seeders;

use App\Models\Blog;
use App\Models\BlogComment;
use App\Models\Settings\BlogSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BlogSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            $appName = config('app.name', 'Ecommerce');

            $author = User::query()->firstOrCreate(
                ['email' => 'editor@example.com'],
                [
                    'name' => 'Content Editor',
                    'password' => Hash::make('password'),
                    'status' => 'active',
                    'email_verified_at' => now(),
                ]
            );

            BlogSetting::query()->updateOrCreate([], [
                'enabled' => true,
                'layout' => 'grid',
                'list_enable_thumbnail' => true,
                'list_show_excerpt' => true,
                'list_show_author' => true,
                'list_show_published_date' => true,
                'list_show_reading_time' => true,
                'show_on_home' => true,
                'home_limit' => 3,
                'allow_comments' => true,
                'enable_related' => true,
                'enable_search' => true,
                'default_meta_title' => $appName.' Blog',
                'default_meta_description' => 'Buying guides, product care tips, and shopping inspiration from '.$appName.'.',
                'open_graph_image' => 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&auto=format&fit=crop',
                'canonical_url' => rtrim((string) config('app.url'), '/').'/blogs',
                'updated_by' => $author->id,
            ]);

            foreach ($this->posts() as $index => $post) {
                $content = $this->content($post['title'], $post['theme']);
                $blog = Blog::query()->updateOrCreate(
                    ['slug' => $post['slug']],
                    [
                        'author_id' => $author->id,
                        'title' => $post['title'],
                        'featured_image' => $post['image'],
                        'excerpt' => $post['excerpt'],
                        'content' => $content,
                        'meta_title' => $post['title'].' | '.$appName.' Blog',
                        'meta_description' => Str::limit($post['excerpt'], 155, ''),
                        'open_graph_image' => $post['image'],
                        'status' => 'published',
                        'published_at' => now()->subDays($index + 1),
                        'featured' => $index < 2,
                        'allow_comments_override' => null,
                        'views_count' => 240 - ($index * 17),
                        'reading_time_minutes' => max(1, (int) ceil(str_word_count(strip_tags($content)) / 200)),
                        'created_by' => $author->id,
                        'updated_by' => $author->id,
                    ]
                );

                $this->seedComments($blog);
            }
        });

        Cache::forget('navigation.public.runtime');
        Cache::forget('settings.blog');
        Cache::forget('settings.blog.id');
        Cache::forget('blogs.home.runtime');
    }

    private function posts(): array
    {
        return [
            [
                'title' => 'How to Build a Smarter Everyday Carry Setup',
                'slug' => 'smarter-everyday-carry-setup',
                'theme' => 'everyday essentials',
                'excerpt' => 'A practical guide to choosing bags, chargers, notebooks, and small accessories that make daily routines easier.',
                'image' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200&auto=format&fit=crop',
            ],
            [
                'title' => 'Headphone Buying Guide: Comfort, Battery, and Sound',
                'slug' => 'headphone-buying-guide-comfort-battery-sound',
                'theme' => 'audio gear',
                'excerpt' => 'Compare the details that matter before choosing wireless headphones for commuting, calls, gaming, or focused work.',
                'image' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop',
            ],
            [
                'title' => 'Five Ways to Keep Your Sneakers Looking New',
                'slug' => 'keep-your-sneakers-looking-new',
                'theme' => 'sneaker care',
                'excerpt' => 'Simple care habits that protect materials, preserve color, and extend the life of your favorite sneakers.',
                'image' => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&fit=crop',
            ],
            [
                'title' => 'Desk Setup Essentials for a Cleaner Workspace',
                'slug' => 'desk-setup-essentials-cleaner-workspace',
                'theme' => 'workspace upgrades',
                'excerpt' => 'Create a calmer, more productive desk with thoughtful lighting, cable management, organizers, and compact tech.',
                'image' => 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&auto=format&fit=crop',
            ],
            [
                'title' => 'Choosing the Right Backpack for Travel and Work',
                'slug' => 'choosing-right-backpack-travel-work',
                'theme' => 'travel bags',
                'excerpt' => 'What to check in storage, straps, laptop protection, materials, and size before buying a daily travel backpack.',
                'image' => 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=1200&auto=format&fit=crop',
            ],
            [
                'title' => 'Small Home Upgrades That Feel Premium',
                'slug' => 'small-home-upgrades-that-feel-premium',
                'theme' => 'home lifestyle',
                'excerpt' => 'Affordable upgrades in lighting, storage, scent, and texture that make a room feel more polished.',
                'image' => 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=1200&auto=format&fit=crop',
            ],
        ];
    }

    private function content(string $title, string $theme): string
    {
        return implode("\n\n", [
            "{$title} starts with understanding how the product will be used every day. The best {$theme} choices are not always the flashiest ones. They are the items that solve small problems consistently, feel comfortable in repeated use, and fit naturally into the way you already shop, work, travel, or relax.",
            'Begin with material quality and practical details. Look at stitching, weight, battery life, surface finish, warranty coverage, care requirements, and how easily the item can be cleaned or stored. These details often decide whether a product feels useful after the first week.',
            'Next, compare features against your actual routine. A compact option may be better for commuting, while a larger or more durable option may work better for travel. If you share the item with family members or use it across multiple settings, choose flexible designs and neutral colors.',
            'Finally, think about long-term value. A slightly higher upfront cost can make sense when the product lasts longer, performs better, and needs fewer replacements. Read specifications carefully, check dimensions, and avoid buying based only on discount size.',
            'The easiest way to shop well is to keep a short checklist: purpose, comfort, durability, maintenance, and return policy. If a product passes those five checks, it is much more likely to earn a permanent place in your routine.',
        ]);
    }

    private function seedComments(Blog $blog): void
    {
        foreach ([
            ['name' => 'Nadia Rahman', 'email' => 'nadia.reader@example.com', 'content' => 'Helpful guide. The checklist at the end makes product comparison much easier.'],
            ['name' => 'Arif Hasan', 'email' => 'arif.reader@example.com', 'content' => 'I like that this focuses on daily use instead of only specifications.'],
        ] as $comment) {
            BlogComment::query()->updateOrCreate(
                ['blog_id' => $blog->id, 'author_email' => $comment['email']],
                [
                    'author_name' => $comment['name'],
                    'content' => $comment['content'],
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approved_by' => $blog->author_id,
                ]
            );
        }
    }
}
