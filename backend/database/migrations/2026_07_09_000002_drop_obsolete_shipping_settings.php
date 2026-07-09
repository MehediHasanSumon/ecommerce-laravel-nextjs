<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('shipping_classes');
        Schema::dropIfExists('shipping_settings');
    }

    public function down(): void
    {
        // Obsolete singleton shipping settings and shipping classes were intentionally removed.
    }
};
