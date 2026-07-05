'use client';

import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  status: string;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      {/* Image Container */}
      <div className="relative mb-5 aspect-square overflow-hidden rounded-xl border border-border bg-muted">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Add to wishlist"
          className="absolute right-2 top-2 h-8 w-8 rounded-full border border-border bg-background/85 text-muted-foreground opacity-100 shadow-sm backdrop-blur-sm transition-opacity hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Heart className="h-4 w-4" />
        </Button>
        {product.status !== 'In Stock' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground">
            <div
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                product.status === 'Limited' ? 'bg-orange-500' : 'bg-muted-foreground'
              )}
            />
            {product.status}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-grow">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {product.category}
        </div>
        <h3 className="mb-2 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {product.name}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        {/* Rating & Price */}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-foreground">${product.price.toFixed(2)}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star className="h-3 w-3 fill-orange-500 text-orange-500" />
              <span className="text-xs font-medium text-foreground">{product.rating}</span>
              <span className="text-[10px] text-muted-foreground">({product.reviews})</span>
            </div>
          </div>
          <Button
            size="sm"
            className="flex h-9 items-center gap-2 rounded-full px-4 font-medium shadow-none"
          >
            <ShoppingCart className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
