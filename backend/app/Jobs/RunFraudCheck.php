<?php

namespace App\Jobs;

use App\Models\GuestCustomer;
use App\Models\Order;
use App\Models\User;
use App\Services\Fraud\FraudCheckService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RunFraudCheck implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public int $timeout = 45;

    public bool $failOnTimeout = true;

    public int $uniqueFor = 300;

    public function __construct(
        public string $subjectType,
        public string $subjectId,
        public string $trigger = 'automatic',
        public bool $automatic = true,
        public ?int $actorId = null,
        public bool $bypassCache = false,
    ) {
        $this->onQueue('fraud');
    }

    public function uniqueId(): string
    {
        return "{$this->subjectType}:{$this->subjectId}";
    }

    public function handle(FraudCheckService $checks): void
    {
        if ($this->subjectType === 'order') {
            $order = Order::query()->with(['user', 'guestCustomer'])->find($this->subjectId);
            if (! $order) {
                return;
            }
            $checks->check(
                $checks->inputForOrder($order),
                'order',
                $order->order_number,
                $order,
                $order->user,
                $order->guestCustomer,
                $this->trigger,
                $this->automatic,
                $this->actorId,
                $this->bypassCache,
            );

            return;
        }

        if ($this->subjectType === 'registered') {
            $user = User::query()->find($this->subjectId);
            if (! $user || ! $user->phone) {
                return;
            }
            $checks->check(
                ['phone' => $user->phone, 'name' => $user->name, 'email' => $user->email, 'customer_id' => "registered-{$user->id}"],
                'customer',
                "registered-{$user->id}",
                null,
                $user,
                null,
                $this->trigger,
                $this->automatic,
                $this->actorId,
                $this->bypassCache,
            );

            return;
        }

        if ($this->subjectType === 'guest') {
            $guest = GuestCustomer::query()->find($this->subjectId);
            if (! $guest || ! $guest->phone) {
                return;
            }
            $checks->check(
                ['phone' => $guest->phone, 'name' => $guest->name, 'email' => $guest->email, 'customer_id' => "guest-{$guest->id}"],
                'customer',
                "guest-{$guest->id}",
                null,
                null,
                $guest,
                $this->trigger,
                $this->automatic,
                $this->actorId,
                $this->bypassCache,
            );
        }
    }
}
