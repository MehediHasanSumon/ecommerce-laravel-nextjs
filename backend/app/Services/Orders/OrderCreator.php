<?php

namespace App\Services\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderCreator
{
    public function __construct(private readonly OrderService $orders) {}

    public function create(array $attributes, array $items, ?int $actorId = null): Order
    {
        return DB::transaction(function () use ($attributes, $items, $actorId): Order {
            if ($items === []) {
                throw ValidationException::withMessages(['items' => ['At least one product is required.']]);
            }

            $order = Order::query()->create([
                ...$attributes,
                'order_number' => $attributes['order_number'] ?? $this->nextOrderNumber(),
            ]);

            $this->orders->record($order, 'order', $order->status, null, 'Order created', null, [
                'source' => $order->source,
            ], $actorId);

            foreach ($items as $item) {
                $this->decrementInventory($item);
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'sku' => $item['sku'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price_cents' => $item['unit_price_cents'],
                    'discounted_price_cents' => $item['discounted_price_cents'] ?? null,
                    'line_subtotal_cents' => $item['line_subtotal_cents'],
                    'line_discount_cents' => $item['line_discount_cents'] ?? 0,
                    'selection_snapshot' => $item['selection_snapshot'] ?? null,
                    'pricing_snapshot' => $item['pricing_snapshot'] ?? null,
                    'tax_snapshot' => $item['tax_snapshot'] ?? null,
                ]);
            }

            DB::afterCommit(fn () => $this->orders->queueOrderPlacedNotifications($order->fresh()));

            return $order->fresh('items');
        });
    }

    public function releaseItems(Order $order): void
    {
        $order->loadMissing('items');
        foreach ($order->items as $item) {
            $this->restoreInventory([
                'product_id' => $item->product_id,
                'product_variant_id' => $item->product_variant_id,
                'quantity' => $item->quantity,
            ]);
        }
    }

    public function replaceItems(Order $order, array $items): void
    {
        if ($items === []) {
            throw ValidationException::withMessages(['items' => ['At least one product is required.']]);
        }

        $order->items()->delete();
        foreach ($items as $item) {
            $this->decrementInventory($item);
            $order->items()->create([
                'product_id' => $item['product_id'],
                'product_variant_id' => $item['product_variant_id'] ?? null,
                'product_name' => $item['product_name'],
                'sku' => $item['sku'] ?? null,
                'quantity' => $item['quantity'],
                'unit_price_cents' => $item['unit_price_cents'],
                'discounted_price_cents' => $item['discounted_price_cents'] ?? null,
                'line_subtotal_cents' => $item['line_subtotal_cents'],
                'line_discount_cents' => $item['line_discount_cents'] ?? 0,
                'selection_snapshot' => $item['selection_snapshot'] ?? null,
                'pricing_snapshot' => $item['pricing_snapshot'] ?? null,
                'tax_snapshot' => $item['tax_snapshot'] ?? null,
            ]);
        }
    }

    private function decrementInventory(array $item): void
    {
        $product = Product::query()->lockForUpdate()->findOrFail($item['product_id']);
        $quantity = (int) $item['quantity'];
        if (! empty($item['product_variant_id'])) {
            $variant = ProductVariant::query()
                ->where('product_id', $product->id)
                ->lockForUpdate()
                ->findOrFail($item['product_variant_id']);
            $tracksInventory = $variant->track_inventory ?? $product->track_inventory;
            if (! $tracksInventory) {
                return;
            }
            $available = (int) ($variant->stock_quantity ?? 0);
            if ($available < $quantity) {
                throw ValidationException::withMessages(['items' => ["Insufficient stock for {$product->name}."]]);
            }
            $variant->decrement('stock_quantity', $quantity);

            return;
        }

        if (! $product->track_inventory) {
            return;
        }

        $available = (int) ($product->stock_quantity ?? 0);
        if ($available < $quantity) {
            throw ValidationException::withMessages(['items' => ["Insufficient stock for {$product->name}."]]);
        }
        $product->decrement('stock_quantity', $quantity);
    }

    private function restoreInventory(array $item): void
    {
        $product = Product::query()->lockForUpdate()->find($item['product_id']);
        if (! $product) {
            return;
        }

        $quantity = (int) $item['quantity'];
        if (! empty($item['product_variant_id'])) {
            $variant = ProductVariant::query()
                ->where('product_id', $product->id)
                ->lockForUpdate()
                ->find($item['product_variant_id']);
            if ($variant && ($variant->track_inventory ?? $product->track_inventory)) {
                $variant->increment('stock_quantity', $quantity);
            }

            return;
        }

        if ($product->track_inventory) {
            $product->increment('stock_quantity', $quantity);
        }
    }

    private function nextOrderNumber(): string
    {
        return 'ORD-'.now()->format('Ymd').'-'.strtoupper(Str::random(8));
    }
}
