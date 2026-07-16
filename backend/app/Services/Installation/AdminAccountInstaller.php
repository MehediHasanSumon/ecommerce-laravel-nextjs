<?php

namespace App\Services\Installation;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminAccountInstaller
{
    /**
     * @param  array{name: string, email: string, phone?: string|null, password?: string|null}  $data
     */
    public function install(array $data, string $role): User
    {
        $user = User::withTrashed()->where('email', $data['email'])->first() ?? new User;

        if ($user->trashed()) {
            $user->restore();
        }

        $user->name = $data['name'];
        $user->email = $data['email'];
        $user->status = 'active';
        $user->email_verified_at ??= now();

        if (array_key_exists('phone', $data)) {
            $user->phone = $data['phone'];
        }

        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();
        $user->syncRoles([$role]);

        return $user;
    }
}
