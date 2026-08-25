<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_search_documents', function (Blueprint $table): void {
            $table->foreignId('product_id')->primary()->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('normalized_name', 191)->index();
            $table->string('normalized_sku', 120)->nullable()->index();
            $table->string('normalized_brand', 191)->nullable()->index();
            $table->string('normalized_category', 191)->nullable()->index();
            $table->text('normalized_collections')->nullable();
            $table->text('normalized_tags')->nullable();
            $table->text('normalized_attributes')->nullable();
            $table->text('normalized_keywords')->nullable();
            $table->longText('normalized_description')->nullable();
            $table->longText('searchable_text');
            $table->unsignedBigInteger('sales_count')->default(0)->index();
            $table->unsignedBigInteger('popularity_score')->default(0)->index();
            $table->timestamp('indexed_at')->nullable()->index();
        });

        match (\Illuminate\Support\Facades\DB::getDriverName()) {
            'mysql' => \Illuminate\Support\Facades\DB::statement(
                'ALTER TABLE product_search_documents ADD FULLTEXT INDEX product_search_documents_fulltext (normalized_name, searchable_text)'
            ),
            'pgsql' => \Illuminate\Support\Facades\DB::statement(
                "CREATE INDEX product_search_documents_fulltext ON product_search_documents USING GIN (to_tsvector('simple', searchable_text))"
            ),
            default => null,
        };

        Schema::create('product_search_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('token', 100);
            $table->string('source', 24);
            $table->unsignedSmallInteger('weight');

            $table->unique(['product_id', 'token', 'source'], 'product_search_tokens_unique');
            $table->index(['token', 'source', 'product_id'], 'product_search_tokens_lookup_index');
            $table->index(['product_id', 'weight'], 'product_search_tokens_product_weight_index');
        });

        Schema::create('search_terms', function (Blueprint $table): void {
            $table->id();
            $table->string('normalized_keyword', 191)->unique();
            $table->string('display_keyword', 191);
            $table->unsignedBigInteger('search_count')->default(0)->index();
            $table->unsignedBigInteger('zero_result_count')->default(0)->index();
            $table->unsignedBigInteger('unique_user_count')->default(0);
            $table->unsignedBigInteger('click_count')->default(0)->index();
            $table->unsignedBigInteger('conversion_count')->default(0)->index();
            $table->timestamp('last_searched_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('search_term_visitors', function (Blueprint $table): void {
            $table->foreignId('search_term_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->char('visitor_hash', 64);
            $table->timestamp('first_searched_at');
            $table->timestamp('last_searched_at');

            $table->primary(['search_term_id', 'visitor_hash'], 'search_term_visitors_primary');
            $table->index(['visitor_hash', 'last_searched_at'], 'search_term_visitors_recent_index');
        });

        Schema::create('search_events', function (Blueprint $table): void {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('search_term_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->char('visitor_hash', 64);
            $table->char('session_hash', 64);
            $table->unsignedInteger('result_count')->default(0);
            $table->json('filters')->nullable();
            $table->string('source', 30)->default('results');
            $table->timestamp('searched_at')->index();

            $table->index(['search_term_id', 'searched_at'], 'search_events_term_date_index');
            $table->index(['user_id', 'searched_at'], 'search_events_user_date_index');
            $table->index(['visitor_hash', 'searched_at'], 'search_events_visitor_date_index');
            $table->index(['result_count', 'searched_at'], 'search_events_results_date_index');
        });

        Schema::create('search_clicks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('search_event_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('search_term_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->char('visitor_hash', 64);
            $table->string('target_type', 30);
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('target_slug', 255)->nullable();
            $table->unsignedSmallInteger('position')->nullable();
            $table->timestamp('clicked_at')->index();

            $table->index(['search_term_id', 'clicked_at'], 'search_clicks_term_date_index');
            $table->index(['target_type', 'target_id', 'clicked_at'], 'search_clicks_target_date_index');
        });

        Schema::create('user_search_histories', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('normalized_keyword', 191);
            $table->string('display_keyword', 191);
            $table->unsignedInteger('search_count')->default(1);
            $table->timestamp('last_searched_at')->index();
            $table->timestamps();

            $table->unique(['user_id', 'normalized_keyword'], 'user_search_histories_unique');
            $table->index(['user_id', 'last_searched_at'], 'user_search_histories_recent_index');
        });

        Schema::create('search_conversions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('search_event_id')->nullable()->constrained()->nullOnDelete()->cascadeOnUpdate();
            $table->foreignId('search_term_id')->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete()->cascadeOnUpdate();
            $table->unsignedBigInteger('revenue_cents')->default(0);
            $table->timestamp('converted_at')->index();

            $table->index(['search_term_id', 'converted_at'], 'search_conversions_term_date_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_conversions');
        Schema::dropIfExists('user_search_histories');
        Schema::dropIfExists('search_clicks');
        Schema::dropIfExists('search_events');
        Schema::dropIfExists('search_term_visitors');
        Schema::dropIfExists('search_terms');
        Schema::dropIfExists('product_search_tokens');
        Schema::dropIfExists('product_search_documents');
    }
};
