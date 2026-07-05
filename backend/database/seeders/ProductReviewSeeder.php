<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductReviewImage;
use App\Models\ProductReviewVote;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProductReviewSeeder extends Seeder
{
    public function run(): void
    {
        $users = $this->seedReviewUsers();
        ProductReviewVote::query()->delete();
        ProductReviewImage::query()->delete();
        ProductReview::query()->delete();

        Product::query()->where('status', 'active')->inRandomOrder()->limit(120)->get()->each(function (Product $product) use ($users): void {
            $reviewCount = fake()->numberBetween(2, 7);
            $ratingTotal = 0;

            for ($index = 0; $index < $reviewCount; $index++) {
                $rating = fake()->numberBetween(3, 5);
                $ratingTotal += $rating;
                $review = ProductReview::query()->create([
                    'product_id' => $product->id,
                    'user_id' => $users->random()->id,
                    'order_item_id' => fake()->numberBetween(10000, 99999),
                    'rating' => $rating,
                    'title' => fake()->randomElement([
                        'Exactly what I needed',
                        'Great quality for the price',
                        'Reliable everyday purchase',
                        'Looks and feels premium',
                        'Would buy again',
                    ]),
                    'comment' => fake()->randomElement([
                        'The product arrived quickly and matched the description. Setup was straightforward and the finish feels durable.',
                        'I used this for a few weeks before reviewing it. The quality is consistent and the packaging was excellent.',
                        'Good value, clear product details, and no surprises during checkout or delivery.',
                        'This became part of my daily routine almost immediately. The size, feel, and performance are all solid.',
                    ]),
                    'helpful_count' => fake()->numberBetween(0, 34),
                    'is_verified_purchase' => fake()->boolean(82),
                    'status' => fake()->randomElement(['approved', 'approved', 'approved', 'pending']),
                    'created_at' => now()->subDays(fake()->numberBetween(1, 180)),
                    'updated_at' => now(),
                ]);

                if (fake()->boolean(28)) {
                    ProductReviewImage::query()->create([
                        'product_review_id' => $review->id,
                        'url' => 'reviews/'.$product->slug.'/review-'.$review->id.'.webp',
                        'sort_order' => 0,
                    ]);
                }

                $voters = $users->where('id', '!=', $review->user_id)->random(min(fake()->numberBetween(1, 5), $users->count() - 1));
                foreach ($voters as $voter) {
                    ProductReviewVote::query()->updateOrCreate(
                        ['product_review_id' => $review->id, 'user_id' => $voter->id],
                        ['is_helpful' => fake()->boolean(85)]
                    );
                }
            }

            $approvedCount = ProductReview::query()->where('product_id', $product->id)->where('status', 'approved')->count();
            $approvedAverage = ProductReview::query()->where('product_id', $product->id)->where('status', 'approved')->avg('rating');
            $product->forceFill([
                'review_count' => $approvedCount,
                'rating_average' => round((float) ($approvedAverage ?: ($ratingTotal / max(1, $reviewCount))), 2),
            ])->save();
        });
    }

    private function seedReviewUsers()
    {
        $users = collect();
        for ($index = 1; $index <= 40; $index++) {
            $users->push(User::query()->updateOrCreate(
                ['email' => "shopper{$index}@example.com"],
                [
                    'name' => fake()->name(),
                    'email_verified_at' => now(),
                    'password' => bcrypt('password'),
                    'status' => 'active',
                ]
            ));
        }

        return $users;
    }
}
