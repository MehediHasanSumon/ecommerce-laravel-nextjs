'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import axios from 'axios';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductListing } from '@/components/product/ProductListing';
import { ProductGridSkeleton } from '@/components/skeleton';
import {
  fetchProducts,
  type ProductFilterMetadata,
  type ProductQueryParams,
} from '@/services/catalog-service';
import type { PaginationMeta } from '@/features/admin/shared/types';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { selectBrandsEnabled, useSettingsStore } from '@/store/settings-store';

const SHOP_PER_PAGE = 15;
const defaultFilters: ProductFilterMetadata = {
  brands: [],
  attributes: [],
  price: { min: 0, max: 0 },
  availability: [
    { label: 'In Stock', value: 'in_stock' },
    { label: 'Out of Stock', value: 'out_of_stock' },
  ],
  sort: [
    { label: 'Default', value: 'default' },
    { label: 'Newest', value: 'newest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Name: A to Z', value: 'name_asc' },
    { label: 'Name: Z to A', value: 'name_desc' },
    { label: 'Best Selling', value: 'best_selling' },
    { label: 'Highest Rated', value: 'highest_rated' },
    { label: 'Most Popular', value: 'most_popular' },
    { label: 'Featured', value: 'featured' },
  ],
};

type ShopQuery = {
  search: string;
  brand: string[];
  attributes: Record<string, string[]>;
  price_min: string;
  price_max: string;
  availability: string;
  rating: string;
  sort: string;
  page: number;
};

function csv(value: string | null) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parsePositiveNumber(value: string | null) {
  if (!value) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : '';
}

function parseQuery(searchParams: URLSearchParams): ShopQuery {
  const validSorts = new Set(defaultFilters.sort.map((item) => item.value));
  const validAvailability = new Set(defaultFilters.availability.map((item) => item.value));
  const reservedKeys = new Set([
    'search',
    'brand',
    'price_min',
    'price_max',
    'availability',
    'rating',
    'sort',
    'page',
  ]);
  const attributes: Record<string, string[]> = {};

  searchParams.forEach((value, key) => {
    if (!reservedKeys.has(key) && /^[a-z0-9-]+$/.test(key)) {
      const selected = csv(value).filter((item) => /^[a-zA-Z0-9-_]+$/.test(item));
      if (selected.length) {
        attributes[key] = selected;
      }
    }
  });

  const page = Number(searchParams.get('page') ?? 1);
  const sort = searchParams.get('sort') ?? 'default';
  const availability = searchParams.get('availability') ?? '';

  return {
    search: (searchParams.get('search') ?? '').slice(0, 120),
    brand: csv(searchParams.get('brand')),
    attributes,
    price_min: parsePositiveNumber(searchParams.get('price_min')),
    price_max: parsePositiveNumber(searchParams.get('price_max')),
    availability: validAvailability.has(availability) ? availability : '',
    rating: parsePositiveNumber(searchParams.get('rating')),
    sort: validSorts.has(sort) ? sort : 'default',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function serializeQuery(query: ShopQuery) {
  const params = new URLSearchParams();

  if (query.search) params.set('search', query.search);
  if (query.brand.length) params.set('brand', query.brand.join(','));
  Object.entries(query.attributes).forEach(([slug, values]) => {
    if (values.length) params.set(slug, values.join(','));
  });
  if (query.price_min) params.set('price_min', query.price_min);
  if (query.price_max) params.set('price_max', query.price_max);
  if (query.availability) params.set('availability', query.availability);
  if (query.rating) params.set('rating', query.rating);
  if (query.sort !== 'default') params.set('sort', query.sort);
  if (query.page > 1) params.set('page', String(query.page));
  return params;
}

function toApiParams(query: ShopQuery, brandsEnabled: boolean): ProductQueryParams {
  return {
    search: query.search || undefined,
    brand: brandsEnabled ? (query.brand.join(',') || undefined) : undefined,
    attributes: JSON.stringify(query.attributes),
    price_min: query.price_min || undefined,
    price_max: query.price_max || undefined,
    availability: query.availability || undefined,
    rating: query.rating || undefined,
    sort: query.sort,
    page: query.page,
    per_page: SHOP_PER_PAGE,
  };
}

function FilterSidebar({
  filters,
  query,
  onPatch,
  onToggleBrand,
  onToggleAttribute,
  onClearAll,
  disabled,
  brandsEnabled,
}: {
  filters: ProductFilterMetadata;
  query: ShopQuery;
  onPatch: (patch: Partial<ShopQuery>) => void;
  onToggleBrand: (slug: string) => void;
  onToggleAttribute: (attributeSlug: string, valueSlug: string) => void;
  onClearAll: () => void;
  disabled: boolean;
  brandsEnabled: boolean;
}) {
  const hasFilters =
    query.search ||
    (brandsEnabled && query.brand.length) ||
    Object.values(query.attributes).some((values) => values.length) ||
    query.price_min ||
    query.price_max ||
    query.availability ||
    query.rating;

  return (
    <div className="space-y-6" aria-busy={disabled}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">Filters</h2>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {brandsEnabled ? (
        <div>
          <h3 className="font-semibold text-sm mb-3">Brand</h3>
          <div className="space-y-1.5">
            {filters.brands.length ? (
              filters.brands.map((brand) => (
                <label key={brand.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={query.brand.includes(brand.slug)}
                    onChange={() => onToggleBrand(brand.slug)}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    <span className="truncate">{brand.name}</span>
                    <span className="text-xs opacity-60">{brand.count}</span>
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No brands available.</p>
            )}
          </div>
        </div>
      ) : null}

      {filters.attributes.map((attribute) => (
        <div key={attribute.id}>
          <h3 className="font-semibold text-sm mb-3">{attribute.name}</h3>
          <div className="space-y-1.5">
            {attribute.values.map((value) => (
              <label key={value.id} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(query.attributes[attribute.slug] ?? []).includes(value.slug)}
                  onChange={() => onToggleAttribute(attribute.slug, value.slug)}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  <span className="truncate">{value.display_value || value.value}</span>
                  <span className="text-xs opacity-60">{value.count}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div>
        <h3 className="font-semibold text-sm mb-3">Price Range</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={query.price_min}
            onChange={(event) => onPatch({ price_min: parsePositiveNumber(event.target.value), page: 1 })}
            placeholder="Enter minimum price"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="Minimum price"
          />
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={query.price_max}
            onChange={(event) => onPatch({ price_max: parsePositiveNumber(event.target.value), page: 1 })}
            placeholder="Enter maximum price"
            className="h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            aria-label="Maximum price"
          />
        </div>
        {query.price_min && query.price_max && Number(query.price_min) > Number(query.price_max) ? (
          <p className="mt-2 text-xs text-destructive">Minimum price must be less than maximum.</p>
        ) : null}
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Availability</h3>
        <div className="space-y-2">
          {filters.availability.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPatch({ availability: query.availability === option.value ? '' : option.value, page: 1 })}
              className={cn(
                'block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors',
                query.availability === option.value
                  ? 'bg-primary font-medium text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm mb-3">Min. Rating</h3>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onPatch({ rating: query.rating === String(rating) ? '' : String(rating), page: 1 })}
              className={cn(
                'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                query.rating === String(rating)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}
                  />
                ))}
              </div>
              <span className="text-xs">& up</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopLoadingPage />}>
      <ShopPageContent />
    </Suspense>
  );
}

function ShopLoadingPage() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto w-full max-w-7xl px-3 py-6 pb-16 sm:px-4 sm:py-8 lg:px-6">
        <div className="mb-6 h-5 w-36 rounded bg-muted animate-pulse" />
        <div className="mb-6 space-y-2">
          <div className="h-9 w-48 rounded bg-muted animate-pulse" />
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-8">
          <aside className="hidden h-[36rem] w-60 shrink-0 rounded-2xl bg-muted animate-pulse lg:block" />
          <div className="min-w-0 flex-1">
            <div className="mb-6 h-10 w-full rounded-xl bg-muted animate-pulse" />
            <ProductGridSkeleton count={SHOP_PER_PAGE} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ShopPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<ProductFilterMetadata>(defaultFilters);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const brandsEnabled = useSettingsStore(selectBrandsEnabled);
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const [searchInput, setSearchInput] = useState(query.search);
  const serializedQuery = useMemo(() => serializeQuery(query).toString(), [query]);

  useEffect(() => setMounted(true), []);
  useEffect(() => setSearchInput(query.search), [query.search]);

  const replaceQuery = useCallback(
    (next: ShopQuery) => {
      const params = serializeQuery(next);
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const patchQuery = useCallback(
    (patch: Partial<ShopQuery>) => {
      replaceQuery({ ...query, ...patch });
    },
    [query, replaceQuery],
  );

  useEffect(() => {
    if (!brandsEnabled && query.brand.length) {
      patchQuery({ brand: [], page: 1 });
    }
  }, [brandsEnabled, patchQuery, query.brand.length]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput !== query.search) {
        patchQuery({ search: searchInput.trim(), page: 1 });
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [patchQuery, query.search, searchInput]);

  useEffect(() => {
    if (query.price_min && query.price_max && Number(query.price_min) > Number(query.price_max)) {
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetchProducts(toApiParams(query, brandsEnabled), { signal: controller.signal })
      .then((response) => {
        setProducts(response.items);
        setFilters(response.filters);
        setPagination(response.pagination);
        if (response.pagination.last_page > 0 && query.page > response.pagination.last_page) {
          patchQuery({ page: response.pagination.last_page });
        }
      })
      .catch((caught) => {
        if (axios.isCancel(caught) || caught?.name === 'CanceledError') return;
        setProducts([]);
        setError('Unable to load products. Please try again.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [brandsEnabled, patchQuery, query, serializedQuery]);

  const toggleBrand = (slug: string) => {
    if (!brandsEnabled) return;

    const next = query.brand.includes(slug)
      ? query.brand.filter((item) => item !== slug)
      : [...query.brand, slug];
    patchQuery({ brand: next, page: 1 });
  };

  const toggleAttribute = (attributeSlug: string, valueSlug: string) => {
    const current = query.attributes[attributeSlug] ?? [];
    const nextValues = current.includes(valueSlug)
      ? current.filter((item) => item !== valueSlug)
      : [...current, valueSlug];
    const nextAttributes = { ...query.attributes, [attributeSlug]: nextValues };
    if (!nextValues.length) delete nextAttributes[attributeSlug];
    patchQuery({ attributes: nextAttributes, page: 1 });
  };

  const clearAll = () => {
    replaceQuery({ ...query, search: '', brand: [], attributes: {}, price_min: '', price_max: '', availability: '', rating: '', page: 1 });
  };

  const page = pagination?.current_page ?? query.page;
  const lastPage = pagination?.last_page ?? 1;
  const total = pagination?.total ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="mx-auto w-full max-w-7xl px-3 py-6 pb-16 sm:px-4 sm:py-8 lg:px-6">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Shop</span>
        </nav>

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">All Products</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} products found
            </p>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-24 bg-card border border-border rounded-2xl p-5">
              <FilterSidebar
                filters={filters}
                query={query}
                onPatch={patchQuery}
                onToggleBrand={toggleBrand}
                onToggleAttribute={toggleAttribute}
                onClearAll={clearAll}
                disabled={loading}
                brandsEnabled={brandsEnabled}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                <SlidersHorizontal size={15} /> Filters
              </button>
              <div className="relative min-w-0 basis-full sm:min-w-[260px] sm:flex-1 lg:max-w-2xl">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="shop-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search..."
                  className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="sm:ml-auto">
                <Select value={query.sort} onValueChange={(sort) => patchQuery({ sort, page: 1 })}>
                  <SelectTrigger className="h-10 w-[150px] rounded-xl bg-card text-sm font-medium sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filters.sort.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!mounted || loading ? (
              <ProductGridSkeleton count={SHOP_PER_PAGE} />
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <SlidersHorizontal size={32} className="text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">Products could not load</h3>
                <p className="text-muted-foreground text-sm mb-6">{error}</p>
                <button
                  onClick={() => patchQuery({ page: query.page })}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Retry
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <SlidersHorizontal size={32} className="text-muted-foreground" />
                </div>
                <h3 className="font-bold text-lg mb-2">No products found</h3>
                <p className="text-muted-foreground text-sm mb-6">Try adjusting your filters</p>
                <button
                  onClick={clearAll}
                  className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <ProductListing products={products} />
            )}

            {!loading && !error && lastPage > 1 ? (
              <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Product pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => patchQuery({ page: page - 1 })}
                  className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(lastPage, 5) }, (_, index) => {
                  const start = Math.max(1, Math.min(page - 2, lastPage - 4));
                  const pageNumber = start + index;
                  if (pageNumber > lastPage) return null;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      aria-current={pageNumber === page ? 'page' : undefined}
                      onClick={() => patchQuery({ page: pageNumber })}
                      className={cn(
                        'rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted',
                        pageNumber === page && 'bg-primary text-primary-foreground hover:bg-primary',
                      )}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={page >= lastPage}
                  onClick={() => patchQuery({ page: page + 1 })}
                  className="rounded-xl border border-border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
                >
                  Next
                </button>
              </nav>
            ) : null}
          </div>
        </div>
      </main>

      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="absolute bottom-0 right-0 top-0 flex w-[min(20rem,calc(100vw-2rem))] flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-bold">Filters</h2>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="rounded-lg p-2 transition-colors hover:bg-muted"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterSidebar
                filters={filters}
                query={query}
                onPatch={patchQuery}
                onToggleBrand={toggleBrand}
                onToggleAttribute={toggleAttribute}
                onClearAll={clearAll}
                disabled={loading}
                brandsEnabled={brandsEnabled}
              />
            </div>
            <div className="p-5 border-t border-border">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Show {total} Results
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
