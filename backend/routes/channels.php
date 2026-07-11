<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{id}', fn (User $user, int $id): bool => (int) $user->id === $id);

Broadcast::channel('admin.{id}', fn (User $user, int $id): bool => (int) $user->id === $id && $user->hasAnyRole(['admin', 'super-admin']));
