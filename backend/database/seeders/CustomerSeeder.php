<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'name' => 'Rahim Ahmed',
                'mobile' => '01711000001',
                'email' => 'rahim@example.com',
                'address' => 'House 14, Road 5, Dhanmondi, Dhaka',
                'status' => 'active',
            ],
            [
                'name' => 'Karim Chowdhury',
                'mobile' => '01811000002',
                'email' => 'karim@example.com',
                'address' => 'GEC Circle, Nasirabad, Chattogram',
                'status' => 'active',
            ],
            [
                'name' => 'Fatima Begum',
                'mobile' => '01911000003',
                'email' => 'fatima@example.com',
                'address' => 'Zindabazar, Sylhet',
                'status' => 'active',
            ],
            [
                'name' => 'Tanvir Hasan',
                'mobile' => '01611000004',
                'email' => 'tanvir@example.com',
                'address' => 'Shaheb Bazar, Rajshahi',
                'status' => 'active',
            ],
            [
                'name' => 'Nusrat Jahan',
                'mobile' => '01511000005',
                'email' => 'nusrat@example.com',
                'address' => 'Sonadanga, Khulna',
                'status' => 'inactive',
            ],
        ];

        foreach ($customers as $data) {
            Customer::query()->firstOrCreate(['mobile' => $data['mobile']], $data);
        }
    }
}
