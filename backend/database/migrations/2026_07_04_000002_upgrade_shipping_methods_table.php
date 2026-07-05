<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('shipping_methods')) {
            return;
        }

        Schema::table('shipping_methods', function (Blueprint $table) {
            if (! Schema::hasColumn('shipping_methods', 'slug')) {
                $table->string('slug')->nullable()->after('name');
            }
            if (! Schema::hasColumn('shipping_methods', 'description')) {
                $table->text('description')->nullable()->after('slug');
            }
            if (! Schema::hasColumn('shipping_methods', 'delivery_type')) {
                $table->string('delivery_type')->nullable()->after('description');
            }
            if (! Schema::hasColumn('shipping_methods', 'estimated_delivery_time')) {
                $table->string('estimated_delivery_time')->nullable()->after('delivery_type');
            }
        });

        DB::table('shipping_methods')
            ->select(['id', 'name', 'code', 'type', 'estimated_days_min', 'estimated_days_max'])
            ->orderBy('id')
            ->get()
            ->each(function (object $method): void {
                $estimated = null;
                if ($method->estimated_days_min && $method->estimated_days_max) {
                    $estimated = $method->estimated_days_min === $method->estimated_days_max
                        ? "{$method->estimated_days_min} day".($method->estimated_days_min > 1 ? 's' : '')
                        : "{$method->estimated_days_min}-{$method->estimated_days_max} days";
                } elseif ($method->estimated_days_min) {
                    $estimated = "{$method->estimated_days_min}+ days";
                }

                DB::table('shipping_methods')
                    ->where('id', $method->id)
                    ->update([
                        'slug' => $method->code ?: Str::slug($method->name),
                        'delivery_type' => $method->type,
                        'estimated_delivery_time' => $estimated,
                    ]);
            });

        if (Schema::hasColumn('shipping_methods', 'slug')) {
            Schema::table('shipping_methods', function (Blueprint $table) {
                $table->unique('slug');
            });
        }
    }

    public function down(): void
    {
        Schema::table('shipping_methods', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'description', 'delivery_type', 'estimated_delivery_time']);
        });
    }
};
