<?php

namespace App\Services\Admin;

use App\Models\GuestCustomer;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\Settings\CompanySetting;
use App\Models\Settings\ShippingMethod;
use App\Models\User;
use App\Services\Checkout\AddressData;
use App\Services\Commerce\ProductSelectionService;
use App\Services\Customers\GuestCustomerService;
use App\Services\Fraud\FraudAutomationService;
use App\Services\Orders\OrderCreator;
use App\Services\Orders\OrderService;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminOrderCreationService
{
    public function __construct(
        private readonly ProductSelectionService $selections,
        private readonly GuestCustomerService $guestCustomers,
        private readonly OrderCreator $creator,
        private readonly OrderService $orders,
        private readonly PaymentGatewayManager $payments,
        private readonly FraudAutomationService $fraudAutomation,
    ) {}

    public function options(): array
    {
        return [
            'registered_customers' => User::query()
                ->whereHas('roles', fn ($query) => $query->where('name', 'user'))
                ->orderBy('name')
                ->limit(250)
                ->get(['id', 'name', 'email', 'phone']),
            'guest_customers' => GuestCustomer::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->limit(250)
                ->get(['id', 'name', 'email', 'phone', 'billing_address', 'shipping_address']),
            'shipping_methods' => ShippingMethod::query()
                ->where('status', true)
                ->orderBy('display_order')
                ->get(['id', 'name', 'rate_cents', 'shipping_zone_id'])
                ->map(fn ($method): array => [
                    'id' => $method->id,
                    'name' => $method->name,
                    'rate' => round($method->rate_cents / 100, 2),
                ]),
            'payment_methods' => $this->payments->enabledSettings()
                ->map(fn ($setting): array => [
                    'gateway' => $setting->gateway,
                    'name' => $setting->additional_configuration['display_name'] ?? str($setting->gateway)->replace('_', ' ')->title()->toString(),
                ]),
            'statuses' => [
                'order' => OrderService::ORDER_STATUSES,
                'payment' => OrderService::PAYMENT_STATUSES,
            ],
        ];
    }

    public function searchProducts(string $search = '', array $ids = []): array
    {
        return Product::query()
            ->where('status', 'active')
            ->whereNotNull('published_at')
            ->when($ids !== [], fn ($query) => $query->whereIn('id', $ids))
            ->when($ids === [] && $search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('sku', 'like', "%{$search}%")))
            ->with([
                'variants' => fn ($query) => $query->where('status', 'active')->with('attributeValues.attribute'),
            ])
            ->orderBy('name')
            ->limit(20)
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'price' => $product->variants->isEmpty()
                    ? round(((int) $product->base_price_cents) / 100, 2)
                    : null,
                'stock' => $product->stock_quantity,
                'variants' => $product->variants->map(fn ($variant): array => [
                    'id' => $variant->id,
                    'label' => $variant->attributeValues
                        ->map(fn ($value) => "{$value->attribute?->name}: {$value->value}")
                        ->filter()
                        ->implode(', ') ?: $variant->sku,
                    'sku' => $variant->sku,
                    'price' => round(((int) $variant->price_cents) / 100, 2),
                    'stock' => $variant->stock_quantity,
                ])->values(),
            ])->values()->all();
    }

    public function create(array $data, int $actorId): Order
    {
        $fraudBilling = AddressData::snapshot(AddressData::normalize($data['billing_address']));
        $fraudShipping = AddressData::snapshot(AddressData::normalize($data['shipping_address']));
        $fraudUser = $data['customer_type'] === 'registered'
            ? User::query()->findOrFail($data['user_id'])
            : null;
        $fraudGuest = $data['customer_type'] === 'guest'
            ? GuestCustomer::query()->findOrFail($data['guest_customer_id'])
            : null;
        $this->fraudAutomation->checkOrderCreation([
            'phone' => $fraudBilling['phone'] ?? $fraudUser?->phone ?? $fraudGuest?->phone,
            'name' => $fraudBilling['full_name'] ?? $fraudUser?->name ?? $fraudGuest?->name,
            'email' => $fraudBilling['email'] ?? $fraudUser?->email ?? $fraudGuest?->email,
            'billing_address' => $fraudBilling,
            'shipping_address' => $fraudShipping,
            'customer_id' => $fraudUser ? "registered-{$fraudUser->id}" : ($fraudGuest ? "guest-{$fraudGuest->id}" : null),
        ], $data['payment_method'], $fraudUser, $fraudGuest, 'admin_order_creation', $actorId);

        return DB::transaction(function () use ($data, $actorId): Order {
            $billing = AddressData::snapshot(AddressData::normalize($data['billing_address']));
            $shipping = AddressData::snapshot(AddressData::normalize($data['shipping_address']));
            [$userId, $guestId] = $this->resolveCustomer($data, $billing, $shipping);

            $items = collect($data['items'])->map(function (array $item): array {
                $selection = $this->selections->resolveCartSelection([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'quantity' => $item['quantity'],
                ]);
                if (! $selection['variant'] && $selection['product']->variants->where('status', 'active')->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        'items' => ["Select a variant for {$selection['product']->name}."],
                    ]);
                }
                $unitPrice = array_key_exists('unit_price', $item) && $item['unit_price'] !== null
                    ? $this->money($item['unit_price'])
                    : (int) $selection['unit_price_cents'];
                $discount = min($unitPrice * $selection['quantity'], $this->money($item['discount'] ?? 0));

                return [
                    'product_id' => $selection['product']->id,
                    'product_variant_id' => $selection['variant']?->id,
                    'product_name' => $selection['product']->name,
                    'sku' => $selection['variant']?->sku ?: $selection['product']->sku,
                    'quantity' => $selection['quantity'],
                    'unit_price_cents' => $unitPrice,
                    'discounted_price_cents' => $discount > 0 ? max(0, $unitPrice - intdiv($discount, $selection['quantity'])) : null,
                    'line_subtotal_cents' => $unitPrice * $selection['quantity'],
                    'line_discount_cents' => $discount,
                    'selection_snapshot' => $selection['selection_snapshot'],
                    'pricing_snapshot' => $selection['pricing_snapshot'],
                    'tax_snapshot' => $selection['tax_snapshot'],
                ];
            })->all();

            $subtotal = (int) collect($items)->sum('line_subtotal_cents');
            $itemDiscount = (int) collect($items)->sum('line_discount_cents');
            $couponDiscount = $this->money($data['coupon_discount'] ?? 0);
            $additionalDiscount = $this->money($data['additional_discount'] ?? 0);
            $shippingCharge = $this->money($data['shipping_charge'] ?? 0);
            $tax = $this->money($data['tax'] ?? 0);
            $total = max(0, $subtotal - $itemDiscount - $couponDiscount - $additionalDiscount + $shippingCharge + $tax);
            $shippingMethod = ! empty($data['shipping_method_id'])
                ? ShippingMethod::query()->where('status', true)->findOrFail($data['shipping_method_id'])
                : null;
            $this->payments->setting($data['payment_method']);
            $summary = [
                'subtotal_cents' => $subtotal,
                'item_discount_cents' => $itemDiscount,
                'coupon_discount_cents' => $couponDiscount,
                'additional_discount_cents' => $additionalDiscount,
                'shipping_cents' => $shippingCharge,
                'tax_cents' => $tax,
                'total_cents' => $total,
            ];

            $order = $this->creator->create([
                'user_id' => $userId,
                'guest_customer_id' => $guestId,
                'source' => 'admin',
                'status' => $data['status'],
                'payment_status' => $data['payment_status'],
                'payment_method' => $data['payment_method'],
                'shipping_method_id' => $shippingMethod?->id,
                'shipping_zone_id' => $shippingMethod?->shipping_zone_id,
                'shipping_method_name' => $shippingMethod?->name,
                'currency' => $this->currency(),
                'subtotal_cents' => $subtotal,
                'item_discount_cents' => $itemDiscount,
                'coupon_discount_cents' => $couponDiscount + $additionalDiscount,
                'shipping_cents' => $shippingCharge,
                'tax_cents' => $tax,
                'total_cents' => $total,
                'coupon_code' => $data['coupon_code'] ?? null,
                'coupon_snapshot' => $data['coupon_code'] ? ['code' => $data['coupon_code'], 'discount_cents' => $couponDiscount] : null,
                'billing_address' => $billing,
                'shipping_address' => $shipping,
                'summary_snapshot' => $summary,
                'admin_notes' => $data['admin_notes'] ?? null,
                'customer_notes' => $data['customer_notes'] ?? null,
                'delivery_notes' => $data['delivery_notes'] ?? null,
                'placed_at' => now(),
            ], $items, $actorId);

            $transaction = PaymentTransaction::query()->create([
                'transaction_key' => (string) Str::uuid(),
                'order_id' => $order->id,
                'gateway' => $data['payment_method'],
                'status' => $data['payment_status'] === 'paid' ? 'paid' : 'initiated',
                'amount_cents' => $total,
                'currency' => $order->currency,
                'paid_at' => $data['payment_status'] === 'paid' ? now() : null,
            ]);
            $this->orders->record($order, 'payment', $data['payment_status'], null, 'Payment '.$data['payment_status'], null, [
                'gateway' => $transaction->gateway,
                'source' => 'admin',
            ], $actorId);

            return $this->orders->findAdmin($order->id);
        });
    }

    public function update(Order $order, array $data, int $actorId): Order
    {
        return DB::transaction(function () use ($order, $data, $actorId): Order {
            $billing = AddressData::snapshot(AddressData::normalize($data['billing_address']));
            $shipping = AddressData::snapshot(AddressData::normalize($data['shipping_address']));
            [$userId, $guestId] = $this->resolveCustomer($data, $billing, $shipping);
            $this->creator->releaseItems($order);
            $items = $this->prepareItems($data['items']);
            $financials = $this->financials($data, $items);
            $shippingMethod = ! empty($data['shipping_method_id'])
                ? ShippingMethod::query()->where('status', true)->findOrFail($data['shipping_method_id'])
                : null;
            $this->payments->setting($data['payment_method']);
            $previousStatus = $order->status;

            $this->creator->replaceItems($order, $items);
            $order->update([
                'user_id' => $userId,
                'guest_customer_id' => $guestId,
                'status' => $data['status'],
                'payment_status' => $data['payment_status'],
                'payment_method' => $data['payment_method'],
                'shipping_method_id' => $shippingMethod?->id,
                'shipping_zone_id' => $shippingMethod?->shipping_zone_id,
                'shipping_method_name' => $shippingMethod?->name,
                'subtotal_cents' => $financials['subtotal'],
                'item_discount_cents' => $financials['item_discount'],
                'coupon_discount_cents' => $financials['coupon_discount'] + $financials['additional_discount'],
                'shipping_cents' => $financials['shipping'],
                'tax_cents' => $financials['tax'],
                'total_cents' => $financials['total'],
                'coupon_code' => $data['coupon_code'] ?? null,
                'coupon_snapshot' => ! empty($data['coupon_code']) ? ['code' => $data['coupon_code'], 'discount_cents' => $financials['coupon_discount']] : null,
                'billing_address' => $billing,
                'shipping_address' => $shipping,
                'summary_snapshot' => $financials['summary'],
                'admin_notes' => $data['admin_notes'] ?? null,
                'customer_notes' => $data['customer_notes'] ?? null,
                'delivery_notes' => $data['delivery_notes'] ?? null,
            ]);
            $order->transactions()->latest()->first()?->update([
                'gateway' => $data['payment_method'],
                'status' => $data['payment_status'] === 'paid' ? 'paid' : 'initiated',
                'amount_cents' => $financials['total'],
                'paid_at' => $data['payment_status'] === 'paid' ? now() : null,
            ]);
            $this->orders->record($order->fresh(), 'order', $data['status'], $previousStatus, 'Order updated', 'Full order updated from admin.', ['source' => 'admin'], $actorId);

            return $this->orders->findAdmin($order->id);
        });
    }

    private function prepareItems(array $data): array
    {
        return collect($data)->map(function (array $item): array {
            $selection = $this->selections->resolveCartSelection([
                'product_id' => $item['product_id'],
                'product_variant_id' => $item['product_variant_id'] ?? null,
                'quantity' => $item['quantity'],
            ]);
            if (! $selection['variant'] && $selection['product']->variants->where('status', 'active')->isNotEmpty()) {
                throw ValidationException::withMessages(['items' => ["Select a variant for {$selection['product']->name}."]]);
            }
            $unitPrice = array_key_exists('unit_price', $item) && $item['unit_price'] !== null ? $this->money($item['unit_price']) : (int) $selection['unit_price_cents'];
            $discount = min($unitPrice * $selection['quantity'], $this->money($item['discount'] ?? 0));

            return [
                'product_id' => $selection['product']->id,
                'product_variant_id' => $selection['variant']?->id,
                'product_name' => $selection['product']->name,
                'sku' => $selection['variant']?->sku ?: $selection['product']->sku,
                'quantity' => $selection['quantity'],
                'unit_price_cents' => $unitPrice,
                'discounted_price_cents' => $discount > 0 ? max(0, $unitPrice - intdiv($discount, $selection['quantity'])) : null,
                'line_subtotal_cents' => $unitPrice * $selection['quantity'],
                'line_discount_cents' => $discount,
                'selection_snapshot' => $selection['selection_snapshot'],
                'pricing_snapshot' => $selection['pricing_snapshot'],
                'tax_snapshot' => $selection['tax_snapshot'],
            ];
        })->all();
    }

    private function financials(array $data, array $items): array
    {
        $subtotal = (int) collect($items)->sum('line_subtotal_cents');
        $itemDiscount = (int) collect($items)->sum('line_discount_cents');
        $couponDiscount = $this->money($data['coupon_discount'] ?? 0);
        $additionalDiscount = $this->money($data['additional_discount'] ?? 0);
        $shipping = $this->money($data['shipping_charge'] ?? 0);
        $tax = $this->money($data['tax'] ?? 0);
        $total = max(0, $subtotal - $itemDiscount - $couponDiscount - $additionalDiscount + $shipping + $tax);

        return compact('subtotal', 'itemDiscount', 'couponDiscount', 'additionalDiscount', 'shipping', 'tax', 'total') + [
            'item_discount' => $itemDiscount,
            'coupon_discount' => $couponDiscount,
            'additional_discount' => $additionalDiscount,
            'summary' => [
                'subtotal_cents' => $subtotal,
                'item_discount_cents' => $itemDiscount,
                'coupon_discount_cents' => $couponDiscount,
                'additional_discount_cents' => $additionalDiscount,
                'shipping_cents' => $shipping,
                'tax_cents' => $tax,
                'total_cents' => $total,
            ],
        ];
    }

    private function resolveCustomer(array $data, array $billing, array $shipping): array
    {
        if ($data['customer_type'] === 'registered') {
            $user = User::query()
                ->whereHas('roles', fn ($query) => $query->where('name', 'user'))
                ->findOrFail($data['user_id']);

            return [$user->id, null];
        }

        if ($data['customer_type'] === 'guest') {
            $guest = GuestCustomer::query()->where('status', 'active')->findOrFail($data['guest_customer_id']);
            $guest->update([
                'billing_address' => $billing,
                'shipping_address' => $shipping,
                'last_order_at' => now(),
            ]);

            return [null, $guest->id];
        }

        $guestBilling = array_replace($billing, array_filter([
            'full_name' => $data['customer']['name'] ?? null,
            'email' => $data['customer']['email'] ?? null,
            'phone' => $data['customer']['phone'] ?? null,
        ], fn ($value) => $value !== null && trim((string) $value) !== ''));
        $guest = $this->guestCustomers->resolve($guestBilling, $shipping, $data['customer_notes'] ?? null);

        return [null, $guest->id];
    }

    private function money(mixed $value): int
    {
        return max(0, (int) round(((float) $value) * 100));
    }

    private function currency(): string
    {
        $company = CompanySetting::query()->with('currency')->first();

        return $company?->currency?->currency ?: 'BDT';
    }
}
