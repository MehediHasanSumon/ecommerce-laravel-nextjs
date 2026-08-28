<?php

namespace App\Services\Admin;

use App\Models\Customer;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\Settings\CompanySetting;
use App\Models\Settings\ShippingMethod;
use App\Models\User;
use App\Services\Checkout\AddressData;
use App\Services\Commerce\ProductSelectionService;
use App\Services\Fraud\FraudAutomationService;
use App\Services\Orders\OrderCreator;
use App\Services\Orders\OrderService;
use App\Services\Payments\PaymentGatewayManager;
use App\Support\CustomerPhoneNormalizer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminOrderCreationService
{
    public function __construct(
        private readonly ProductSelectionService $selections,
        private readonly OrderCreator $creator,
        private readonly OrderService $orders,
        private readonly PaymentGatewayManager $payments,
        private readonly FraudAutomationService $fraudAutomation,
    ) {}

    public function options(): array
    {
        $customers = Customer::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->limit(250)
            ->get(['id', 'name', 'email', 'mobile', 'address'])
            ->map(fn (Customer $customer): array => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->mobile,
                'mobile' => $customer->mobile,
                'address' => $customer->address,
                'billing_address' => $customer->address ? ['address_line' => $customer->address, 'full_name' => $customer->name, 'phone' => $customer->mobile, 'email' => $customer->email] : null,
                'shipping_address' => $customer->address ? ['address_line' => $customer->address, 'full_name' => $customer->name, 'phone' => $customer->mobile, 'email' => $customer->email] : null,
            ])
            ->values()
            ->all();

        return [
            'customers' => $customers,
            'registered_customers' => $customers,
            'guest_customers' => $customers,
            'shipping_methods' => ShippingMethod::query()
                ->where('status', true)
                ->orderBy('display_order')
                ->get(['id', 'name', 'rate_cents', 'shipping_zone_id'])
                ->map(fn ($method): array => [
                    'id' => $method->id,
                    'name' => $method->name,
                    'rate' => round($method->rate_cents / 100, 2),
                ])
                ->values()
                ->all(),
            'payment_methods' => $this->payments->enabledSettings()
                ->map(fn ($setting): array => [
                    'gateway' => $setting->gateway,
                    'name' => $setting->additional_configuration['display_name'] ?? str($setting->gateway)->replace('_', ' ')->title()->toString(),
                ])
                ->values()
                ->all(),
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
                ->orWhere('sku', 'like', "%{$search}%")
                ->orWhereHas('activeVariants', fn ($variantQuery) => $variantQuery
                    ->where('sku', 'like', "%{$search}%"))))
            ->with([
                'variants' => fn ($query) => $query
                    ->where('status', 'active')
                    ->orderByDesc('is_primary')
                    ->orderBy('id')
                    ->with('attributeValues.attribute'),
            ])
            ->orderBy('name')
            ->limit(20)
            ->get()
            ->map(function (Product $product): array {
                $primaryVariant = $product->defaultActiveVariant();

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $primaryVariant?->sku ?: $product->sku,
                    'price' => round(((int) $product->effectivePriceCents($primaryVariant)) / 100, 2),
                    'stock' => $primaryVariant?->stock_quantity ?? $product->stock_quantity,
                    'primary_variant_id' => $primaryVariant?->id,
                    'variants' => $product->variants->map(fn ($variant): array => [
                        'id' => $variant->id,
                        'label' => $variant->attributeValues
                            ->map(fn ($value) => "{$value->attribute?->name}: {$value->value}")
                            ->filter()
                            ->implode(', ') ?: $variant->sku,
                        'sku' => $variant->sku,
                        'price' => round(((int) $product->effectivePriceCents($variant)) / 100, 2),
                        'stock' => $variant->stock_quantity,
                        'is_primary' => (bool) $variant->is_primary,
                    ])->values(),
                ];
            })->values()->all();
    }

    public function create(array $data, int $actorId): Order
    {
        $billing = AddressData::snapshot(AddressData::normalize($data['billing_address']));
        $shipping = AddressData::snapshot(AddressData::normalize($data['shipping_address']));
        $customerId = $this->resolveCustomer($data, $billing, $shipping);

        return DB::transaction(function () use ($data, $actorId, $billing, $shipping, $customerId): Order {
            $items = collect($data['items'])->map(function (array $item): array {
                $selection = $this->selections->resolveCartSelection([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'quantity' => $item['quantity'],
                ]);
                if (! $selection['variant'] && $selection['product']->variants->where('status', 'active')->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        'items' => ["Please select a variant for {$selection['product']->name}."],
                    ]);
                }

                $customUnitPrice = isset($item['unit_price']) && $item['unit_price'] !== ''
                    ? $this->money($item['unit_price'])
                    : (int) $selection['product']->effectivePriceCents($selection['variant']);
                $itemDiscount = isset($item['discount']) && $item['discount'] !== ''
                    ? $this->money($item['discount'])
                    : 0;

                return [
                    'product_id' => $selection['product']->id,
                    'product_variant_id' => $selection['variant']?->id,
                    'product_name' => $selection['product']->name,
                    'sku' => $selection['variant']?->sku ?: $selection['product']->sku,
                    'quantity' => (int) $item['quantity'],
                    'unit_price_cents' => $customUnitPrice,
                    'discounted_price_cents' => max(0, $customUnitPrice - $itemDiscount),
                    'line_subtotal_cents' => $customUnitPrice * (int) $item['quantity'],
                    'line_discount_cents' => $itemDiscount * (int) $item['quantity'],
                    'selection_snapshot' => [
                        'product_title' => $selection['product']->name,
                        'variant_title' => $selection['variant']?->attributeValues->map(fn ($v) => $v->value)->implode(', '),
                        'attributes' => $selection['variant']?->attributeValues->mapWithKeys(fn ($v) => [$v->attribute?->name ?? 'Attribute' => $v->value])->all() ?? [],
                        'thumbnail_url' => $selection['variant']?->imageUrl() ?: $selection['product']->imageUrl(),
                    ],
                    'pricing_snapshot' => [
                        'base_price_cents' => (int) ($selection['variant']?->price_cents ?? $selection['product']->price_cents),
                        'sale_price_cents' => $customUnitPrice,
                    ],
                    'tax_snapshot' => [],
                ];
            })->values()->all();

            $subtotal = collect($items)->sum(fn ($item) => (int) $item['line_subtotal_cents']);
            $itemDiscount = collect($items)->sum(fn ($item) => (int) $item['line_discount_cents']);
            $shippingMethod = ! empty($data['shipping_method_id'])
                ? ShippingMethod::query()->find($data['shipping_method_id'])
                : null;
            $shippingCharge = isset($data['shipping_charge']) && $data['shipping_charge'] !== ''
                ? $this->money($data['shipping_charge'])
                : (int) ($shippingMethod?->rate_cents ?? 0);
            $tax = isset($data['tax']) && $data['tax'] !== '' ? $this->money($data['tax']) : 0;
            $couponDiscount = isset($data['coupon_discount']) && $data['coupon_discount'] !== ''
                ? $this->money($data['coupon_discount'])
                : 0;
            $additionalDiscount = isset($data['additional_discount']) && $data['additional_discount'] !== ''
                ? $this->money($data['additional_discount'])
                : 0;
            $total = max(0, $subtotal - $itemDiscount - $couponDiscount - $additionalDiscount + $shippingCharge + $tax);

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
                'user_id' => $data['user_id'] ?? null,
                'customer_id' => $customerId,
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
                'coupon_snapshot' => ! empty($data['coupon_code']) ? ['code' => $data['coupon_code'], 'discount_cents' => $couponDiscount] : null,
                'billing_address' => $billing,
                'shipping_address' => $shipping,
                'summary_snapshot' => $summary,
                'customer_notes' => $data['customer_notes'] ?? null,
                'admin_notes' => $data['admin_notes'] ?? null,
                'placed_at' => now(),
            ], $items, $actorId);

            if ($order->payment_status === 'paid') {
                $order->transactions()->create([
                    'public_id' => (string) Str::uuid(),
                    'gateway' => $order->payment_method,
                    'status' => 'completed',
                    'amount_cents' => $order->total_cents,
                    'currency' => $order->currency,
                    'payload' => ['created_by' => $actorId, 'note' => 'Marked paid at order creation'],
                    'created_at' => now(),
                ]);
            }

            return $order;
        });
    }

    public function fullUpdate(Order $order, array $data, int $actorId): Order
    {
        return DB::transaction(function () use ($order, $data, $actorId): Order {
            $billing = AddressData::snapshot(AddressData::normalize($data['billing_address']));
            $shipping = AddressData::snapshot(AddressData::normalize($data['shipping_address']));
            $customerId = $this->resolveCustomer($data, $billing, $shipping);

            $items = collect($data['items'])->map(function (array $item): array {
                $selection = $this->selections->resolveCartSelection([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'quantity' => $item['quantity'],
                ]);

                $customUnitPrice = isset($item['unit_price']) && $item['unit_price'] !== ''
                    ? $this->money($item['unit_price'])
                    : (int) $selection['product']->effectivePriceCents($selection['variant']);
                $itemDiscount = isset($item['discount']) && $item['discount'] !== ''
                    ? $this->money($item['discount'])
                    : 0;

                return [
                    'product_id' => $selection['product']->id,
                    'product_variant_id' => $selection['variant']?->id,
                    'product_name' => $selection['product']->name,
                    'sku' => $selection['variant']?->sku ?: $selection['product']->sku,
                    'quantity' => (int) $item['quantity'],
                    'unit_price_cents' => $customUnitPrice,
                    'discounted_price_cents' => max(0, $customUnitPrice - $itemDiscount),
                    'line_subtotal_cents' => $customUnitPrice * (int) $item['quantity'],
                    'line_discount_cents' => $itemDiscount * (int) $item['quantity'],
                    'selection_snapshot' => [
                        'product_title' => $selection['product']->name,
                        'variant_title' => $selection['variant']?->attributeValues->map(fn ($v) => $v->value)->implode(', '),
                        'attributes' => $selection['variant']?->attributeValues->mapWithKeys(fn ($v) => [$v->attribute?->name ?? 'Attribute' => $v->value])->all() ?? [],
                        'thumbnail_url' => $selection['variant']?->imageUrl() ?: $selection['product']->imageUrl(),
                    ],
                    'pricing_snapshot' => [
                        'base_price_cents' => (int) ($selection['variant']?->price_cents ?? $selection['product']->price_cents),
                        'sale_price_cents' => $customUnitPrice,
                    ],
                    'tax_snapshot' => [],
                ];
            })->values()->all();

            $subtotal = collect($items)->sum(fn ($item) => (int) $item['line_subtotal_cents']);
            $itemDiscount = collect($items)->sum(fn ($item) => (int) $item['line_discount_cents']);
            $shippingMethod = ! empty($data['shipping_method_id'])
                ? ShippingMethod::query()->find($data['shipping_method_id'])
                : null;
            $shippingCharge = isset($data['shipping_charge']) && $data['shipping_charge'] !== ''
                ? $this->money($data['shipping_charge'])
                : (int) ($shippingMethod?->rate_cents ?? 0);
            $tax = isset($data['tax']) && $data['tax'] !== '' ? $this->money($data['tax']) : 0;
            $couponDiscount = isset($data['coupon_discount']) && $data['coupon_discount'] !== ''
                ? $this->money($data['coupon_discount'])
                : 0;
            $additionalDiscount = isset($data['additional_discount']) && $data['additional_discount'] !== ''
                ? $this->money($data['additional_discount'])
                : 0;
            $total = max(0, $subtotal - $itemDiscount - $couponDiscount - $additionalDiscount + $shippingCharge + $tax);

            $this->creator->replaceItems($order, $items);

            $summary = [
                'subtotal_cents' => $subtotal,
                'item_discount_cents' => $itemDiscount,
                'coupon_discount_cents' => $couponDiscount,
                'additional_discount_cents' => $additionalDiscount,
                'shipping_cents' => $shippingCharge,
                'tax_cents' => $tax,
                'total_cents' => $total,
            ];

            $order->update([
                'user_id' => $data['user_id'] ?? $order->user_id,
                'customer_id' => $customerId ?: $order->customer_id,
                'status' => $data['status'],
                'payment_status' => $data['payment_status'],
                'payment_method' => $data['payment_method'],
                'shipping_method_id' => $shippingMethod?->id,
                'shipping_zone_id' => $shippingMethod?->shipping_zone_id,
                'shipping_method_name' => $shippingMethod?->name,
                'subtotal_cents' => $subtotal,
                'item_discount_cents' => $itemDiscount,
                'coupon_discount_cents' => $couponDiscount + $additionalDiscount,
                'shipping_cents' => $shippingCharge,
                'tax_cents' => $tax,
                'total_cents' => $total,
                'coupon_code' => $data['coupon_code'] ?? null,
                'coupon_snapshot' => ! empty($data['coupon_code']) ? ['code' => $data['coupon_code'], 'discount_cents' => $couponDiscount] : null,
                'billing_address' => $billing,
                'shipping_address' => $shipping,
                'summary_snapshot' => $summary,
                'customer_notes' => $data['customer_notes'] ?? null,
                'admin_notes' => $data['admin_notes'] ?? null,
            ]);

            $this->orders->record($order, 'order', $order->status, null, 'Order updated via admin full edit', null, [], $actorId);

            return $order->fresh(['items', 'customer']);
        });
    }

    private function resolveCustomer(array $data, array $billing, array $shipping): ?int
    {
        if (! empty($data['customer_id'])) {
            $customer = Customer::query()->where('status', 'active')->findOrFail((int) $data['customer_id']);

            return $customer->id;
        }

        $phone = CustomerPhoneNormalizer::normalize(
            $data['customer']['mobile'] ?? $data['customer']['phone'] ?? $billing['phone'] ?? $shipping['phone'] ?? ''
        );
        $name = trim((string) ($data['customer']['name'] ?? $billing['full_name'] ?? $shipping['full_name'] ?? 'Customer'));
        $email = trim((string) ($data['customer']['email'] ?? $billing['email'] ?? $shipping['email'] ?? '')) ?: null;
        $address = trim((string) ($data['customer']['address'] ?? $shipping['address_line'] ?? $billing['address_line'] ?? '')) ?: null;

        if ($phone !== '') {
            $customer = Customer::query()->firstOrCreate(
                ['mobile' => $phone],
                [
                    'name' => $name,
                    'email' => $email,
                    'address' => $address,
                    'status' => 'active',
                ]
            );

            return $customer->id;
        }

        return null;
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
