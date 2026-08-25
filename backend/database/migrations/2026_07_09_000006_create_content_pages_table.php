<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_pages', function (Blueprint $table): void {
            $table->id();
            $table->string('slug')->unique();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('template')->default('info');
            $table->json('payload')->nullable();
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->text('meta_keywords')->nullable();
            $table->string('canonical_url')->nullable();
            $table->string('og_title')->nullable();
            $table->text('og_description')->nullable();
            $table->text('og_image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['slug', 'is_active']);
        });

        DB::table('content_pages')->insert($this->defaultPages());
    }

    public function down(): void
    {
        Schema::dropIfExists('content_pages');
    }

    private function defaultPages(): array
    {
        $now = now();

        return [
            [
                'slug' => 'about',
                'title' => 'About LuxeCart',
                'description' => "We're on a mission to make premium shopping accessible to everyone. Founded in 2020, LuxeCart connects discerning shoppers with the world's best brands.",
                'template' => 'about',
                'payload' => json_encode([
                    'stats' => [
                        ['label' => 'Happy Customers', 'value' => '100K+', 'icon' => 'users'],
                        ['label' => 'Products', 'value' => '50K+', 'icon' => 'package'],
                        ['label' => 'Average Rating', 'value' => '4.9', 'icon' => 'star'],
                        ['label' => 'Countries', 'value' => '45+', 'icon' => 'globe'],
                    ],
                    'mission' => [
                        'title' => 'Our Mission',
                        'body' => [
                            'At LuxeCart, we believe that premium quality should not come with a premium price tag. We work directly with top brands and manufacturers to bring you authentic products at fair prices.',
                            'Our platform is built on three pillars: authenticity, accessibility, and sustainability. Every product we carry is verified genuine, and we are committed to reducing our environmental footprint.',
                        ],
                        'image' => 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop',
                        'cta' => ['label' => 'Shop Our Collection', 'href' => '/shop'],
                    ],
                    'values' => [
                        ['title' => 'Quality First', 'description' => 'Every product is carefully vetted and quality-checked before it appears on our platform.', 'icon' => 'star'],
                        ['title' => 'Customer Love', 'description' => 'Our support team is always ready to help. Your satisfaction is our top priority.', 'icon' => 'heart'],
                        ['title' => 'Global Reach', 'description' => 'We ship with reliable logistics partners and transparent tracking.', 'icon' => 'globe'],
                    ],
                    'team' => [
                        ['name' => 'Operations Team', 'role' => 'Customer Experience', 'avatar' => 'https://i.pravatar.cc/150?img=1'],
                        ['name' => 'Merchandising Team', 'role' => 'Product Curation', 'avatar' => 'https://i.pravatar.cc/150?img=4'],
                        ['name' => 'Design Team', 'role' => 'Brand Experience', 'avatar' => 'https://i.pravatar.cc/150?img=9'],
                        ['name' => 'Logistics Team', 'role' => 'Delivery Operations', 'avatar' => 'https://i.pravatar.cc/150?img=11'],
                    ],
                ]),
                'meta_title' => 'About LuxeCart',
                'meta_description' => 'Learn about LuxeCart, our mission, values, and customer-first shopping experience.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'faq',
                'title' => 'Frequently Asked Questions',
                'description' => "Find answers to common questions below. Can't find what you need? Contact us.",
                'template' => 'faq',
                'payload' => json_encode([
                    'categories' => [
                        [
                            'name' => 'Orders & Shipping',
                            'items' => [
                                ['question' => 'How long does shipping take?', 'answer' => 'Shipping time depends on the selected shipping method and delivery zone shown during checkout.'],
                                ['question' => 'How can I track my order?', 'answer' => 'You can track order progress from your account order details page after the order is confirmed.'],
                                ['question' => 'Can I change my delivery address?', 'answer' => 'Contact support as soon as possible. Address changes depend on the current order status.'],
                            ],
                        ],
                        [
                            'name' => 'Returns & Refunds',
                            'items' => [
                                ['question' => 'What is your return policy?', 'answer' => 'Return eligibility depends on product condition, order status, and the published return policy.'],
                                ['question' => 'When will I get my refund?', 'answer' => 'Refund timing depends on gateway processing and internal review after return approval.'],
                            ],
                        ],
                        [
                            'name' => 'Payments',
                            'items' => [
                                ['question' => 'What payment methods do you accept?', 'answer' => 'Available payment methods are loaded dynamically from the active payment gateway settings during checkout.'],
                                ['question' => 'Is my payment information secure?', 'answer' => 'Online payments are processed through configured payment gateways and verified server-side before order confirmation.'],
                            ],
                        ],
                        [
                            'name' => 'Products',
                            'items' => [
                                ['question' => 'Are your products authentic?', 'answer' => 'Product data, availability, and collection placement are managed from the catalog system.'],
                                ['question' => 'What if a product is out of stock?', 'answer' => 'Stock status is shown on product pages and cart validation runs before checkout.'],
                            ],
                        ],
                    ],
                ]),
                'meta_title' => 'Frequently Asked Questions',
                'meta_description' => 'Answers to common LuxeCart ordering, shipping, payment, and product questions.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'privacy',
                'title' => 'Privacy Policy',
                'description' => 'At LuxeCart, we take your privacy seriously. This Privacy Policy describes how we collect, use, and protect your personal information when you use our services.',
                'template' => 'legal',
                'payload' => json_encode([
                    'updatedLabel' => 'Last updated: July 9, 2026',
                    'sections' => [
                        ['title' => 'Information We Collect', 'content' => 'We collect information you provide directly to us, such as account, order, delivery, and support information.'],
                        ['title' => 'How We Use Your Information', 'content' => 'We use information to process orders, provide customer support, send transactional updates, improve services, and meet legal obligations.'],
                        ['title' => 'Information Sharing', 'content' => 'We do not sell personal information. We may share required details with trusted providers that support order, payment, delivery, and customer operations.'],
                        ['title' => 'Data Security', 'content' => 'We use technical and organizational safeguards to protect customer information and payment-related workflows.'],
                        ['title' => 'Cookies & Tracking', 'content' => 'We use cookies to support authentication, cart behavior, preferences, and analytics where enabled.'],
                        ['title' => 'Your Rights', 'content' => 'You may request access or correction of your account data through customer support or available account tools.'],
                    ],
                ]),
                'meta_title' => 'Privacy Policy',
                'meta_description' => 'LuxeCart privacy policy and customer data practices.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'terms',
                'title' => 'Terms & Conditions',
                'description' => 'These Terms and Conditions govern your access to and use of LuxeCart services.',
                'template' => 'legal',
                'payload' => json_encode([
                    'updatedLabel' => 'Last updated: July 9, 2026',
                    'sections' => [
                        ['title' => 'Acceptance of Terms', 'content' => 'By accessing and using LuxeCart, you agree to be bound by these Terms and Conditions.'],
                        ['title' => 'Account Registration', 'content' => 'You are responsible for maintaining accurate account information and protecting your account credentials.'],
                        ['title' => 'Products & Pricing', 'content' => 'Products are subject to availability. Pricing, offers, and promotions may change according to catalog and campaign settings.'],
                        ['title' => 'Orders & Payment', 'content' => 'Orders are processed through checkout and confirmed according to payment verification and order validation rules.'],
                        ['title' => 'Returns & Refunds', 'content' => 'Return and refund eligibility depends on order status, product condition, and the published return policy.'],
                        ['title' => 'Limitation of Liability', 'content' => 'LuxeCart is not liable for indirect or consequential damages arising from use of the service where limited by applicable law.'],
                    ],
                    'contact' => ['label' => 'For questions about these Terms, contact support.', 'href' => '/contact'],
                ]),
                'meta_title' => 'Terms & Conditions',
                'meta_description' => 'LuxeCart terms and conditions for customers.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];
    }
};
