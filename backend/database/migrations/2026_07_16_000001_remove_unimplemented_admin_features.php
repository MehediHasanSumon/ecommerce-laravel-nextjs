<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['stock_movements', 'inventories', 'warehouses', 'email_settings', 'sms_provider_settings', 'localization_settings', 'maintenance_mode_settings'] as $table) {
            Schema::dropIfExists($table);
        }

        $indexes = [
            'product_variants' => ['product_variants_barcode_index'],
            'collections' => ['collections_discount_apply_to_index'],
            'discounts' => ['discounts_applicable_scope_index'],
            'blogs' => ['blogs_scheduled_publish_at_index'],
            'company_settings' => ['company_settings_tax_number_index', 'company_settings_company_active_index'],
            'store_settings' => ['store_settings_default_product_sorting_index', 'store_settings_hide_out_of_stock_products_index'],
            'seo_settings' => ['seo_settings_google_analytics_id_index', 'seo_settings_google_tag_manager_id_index', 'seo_settings_facebook_pixel_id_index'],
        ];

        foreach ($indexes as $table => $tableIndexes) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table, $tableIndexes): void {
                foreach ($tableIndexes as $index) {
                    if (Schema::hasIndex($table, $index)) {
                        $blueprint->dropIndex($index);
                    }
                }
            });
        }

        $columns = [
            'product_variants' => ['barcode', 'low_stock_threshold', 'weight_grams', 'length_cm', 'width_cm', 'height_cm'],
            'collections' => ['discount_apply_to'],
            'discounts' => ['stackable', 'applicable_scope'],
            'blogs' => ['scheduled_publish_at'],
            'hero_settings' => ['transition_speed', 'transition_effect', 'keyboard_navigation'],
            'hero_slide_elements' => ['animation'],
            'company_settings' => ['tax_number', 'trade_license', 'invoice_terms', 'company_active'],
            'store_settings' => ['store_url', 'products_per_page', 'default_product_sorting', 'default_product_view', 'enable_compare', 'enable_stock_management', 'enable_guest_checkout', 'minimum_order_amount_cents', 'maximum_order_amount_cents', 'low_stock_threshold', 'allow_backorders', 'hide_out_of_stock_products'],
            'seo_settings' => ['robots_archive', 'google_analytics_id', 'google_tag_manager_id', 'facebook_pixel_id'],
        ];

        foreach ($columns as $table => $tableColumns) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $existing = array_values(array_filter($tableColumns, fn (string $column): bool => Schema::hasColumn($table, $column)));
            if ($existing !== []) {
                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn($existing));
            }
        }

        if (Schema::hasTable('payment_gateway_settings')) {
            DB::table('payment_gateway_settings')->where('gateway', 'rocket')->delete();
        }
        if (Schema::hasTable('permissions')) {
            DB::table('permissions')->whereIn('name', [
                'adminSettingsEmail',
                'adminSettingsSms',
                'adminSettingsLocalization',
                'adminSettingsMaintenance',
                'adminWarehouses',
                'can_view_warehouse',
            ])->delete();
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('product_variants')) {
            Schema::table('product_variants', function (Blueprint $table): void {
                $table->string('barcode')->nullable()->index();
                $table->integer('low_stock_threshold')->nullable();
                $table->unsignedInteger('weight_grams')->nullable();
                $table->unsignedInteger('length_cm')->nullable();
                $table->unsignedInteger('width_cm')->nullable();
                $table->unsignedInteger('height_cm')->nullable();
            });
        }

        if (Schema::hasTable('collections')) {
            Schema::table('collections', fn (Blueprint $table) => $table->string('discount_apply_to')->default('entire_collection')->index());
        }
        if (Schema::hasTable('discounts')) {
            Schema::table('discounts', function (Blueprint $table): void {
                $table->boolean('stackable')->default(false);
                $table->string('applicable_scope', 50)->default('all')->index();
            });
        }
        if (Schema::hasTable('blogs')) {
            Schema::table('blogs', fn (Blueprint $table) => $table->timestamp('scheduled_publish_at')->nullable()->index());
        }
        if (Schema::hasTable('hero_settings')) {
            Schema::table('hero_settings', function (Blueprint $table): void {
                $table->unsignedInteger('transition_speed')->default(500);
                $table->string('transition_effect', 24)->default('slide');
                $table->boolean('keyboard_navigation')->default(true);
            });
        }
        if (Schema::hasTable('hero_slide_elements')) {
            Schema::table('hero_slide_elements', fn (Blueprint $table) => $table->json('animation')->nullable());
        }
        if (Schema::hasTable('company_settings')) {
            Schema::table('company_settings', function (Blueprint $table): void {
                $table->string('tax_number')->nullable()->index();
                $table->string('trade_license')->nullable();
                $table->text('invoice_terms')->nullable();
                $table->boolean('company_active')->default(true)->index();
            });
        }
        if (Schema::hasTable('store_settings')) {
            Schema::table('store_settings', function (Blueprint $table): void {
                $table->string('store_url')->nullable();
                $table->unsignedSmallInteger('products_per_page')->default(24);
                $table->string('default_product_sorting')->default('latest')->index();
                $table->string('default_product_view')->default('grid');
                $table->boolean('enable_compare')->default(false);
                $table->boolean('enable_stock_management')->default(true);
                $table->boolean('enable_guest_checkout')->default(true);
                $table->unsignedBigInteger('minimum_order_amount_cents')->default(0);
                $table->unsignedBigInteger('maximum_order_amount_cents')->nullable();
                $table->unsignedInteger('low_stock_threshold')->default(5);
                $table->boolean('allow_backorders')->default(false);
                $table->boolean('hide_out_of_stock_products')->default(false)->index();
            });
        }
        if (Schema::hasTable('seo_settings')) {
            Schema::table('seo_settings', function (Blueprint $table): void {
                $table->boolean('robots_archive')->default(true);
                $table->string('google_analytics_id')->nullable()->index();
                $table->string('google_tag_manager_id')->nullable()->index();
                $table->string('facebook_pixel_id')->nullable()->index();
            });
        }
    }
};
