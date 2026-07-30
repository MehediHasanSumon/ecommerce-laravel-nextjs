<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        match (DB::getDriverName()) {
            'mysql' => DB::statement(
                'ALTER TABLE product_search_documents ADD FULLTEXT INDEX product_search_documents_fulltext (normalized_name, searchable_text)'
            ),
            'pgsql' => DB::statement(
                "CREATE INDEX product_search_documents_fulltext ON product_search_documents USING GIN (to_tsvector('simple', searchable_text))"
            ),
            default => null,
        };
    }

    public function down(): void
    {
        match (DB::getDriverName()) {
            'mysql' => DB::statement('ALTER TABLE product_search_documents DROP INDEX product_search_documents_fulltext'),
            'pgsql' => DB::statement('DROP INDEX IF EXISTS product_search_documents_fulltext'),
            default => null,
        };
    }
};
