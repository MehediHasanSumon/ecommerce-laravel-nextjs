<?php

namespace Database\Seeders;

use App\Services\Installation\RolePermissionInstaller;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(RolePermissionInstaller $installer): void
    {
        $installer->install();
    }
}
