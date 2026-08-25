'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  MapPin,
  Phone,
  Package,
  LogOut,
  Settings,
  LayoutDashboard,
  Bell,
  Building2,
  Clock,
  Layers3,
  ShoppingBag,
  Star,
  Tags,
  TrendingUp,
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { BrandLogo } from '@/components/settings/BrandLogo';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationStore } from '@/store/notification-store';
import {
  selectBranding,
  selectBlogSettings,
  selectCategoryDisplaySettings,
  selectCurrencyFingerprint,
  selectFrontendNavigation,
  selectRuntimeCategories,
  selectSettingsPending,
  useSettingsStore,
} from '@/store/settings-store';
import { NAV_LINKS } from '@/constants';
import { formatPrice } from '@/utils/format';
import {
  clearRecentSearches,
  fetchSearchSuggestions,
  removeRecentSearch,
  trackSearchClick,
  type SearchEntitySuggestion,
  type SearchKeywordSuggestion,
  type SearchSuggestions,
} from '@/services/catalog-service';
import type { RuntimeCategory } from '@/types/settings';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { RealtimeNotifications } from '@/components/notifications/RealtimeNotifications';
import {
  clearGuestSearchHistory,
  getGuestSearchHistory,
  rememberGuestSearch,
  removeGuestSearch,
  setSearchAttribution,
} from '@/lib/search-state';

function timeAgo(value?: string | null) {
  if (!value) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NavbarNotificationBell({ onOpen }: { onOpen?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifications = useNotificationStore((state) => state.items);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markRead = useNotificationStore((state) => state.markRead);
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  useEffect(() => {
    if (!isOpen) return;
    void fetchNotifications({ per_page: 8, force: true });
    onOpen?.();

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchNotifications, isOpen, onOpen]);

  return (
    <div ref={menuRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-lg p-2 transition-colors hover:bg-muted"
        aria-label="Notifications"
        title="Notifications"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>
      <div
        className={cn(
          'absolute right-0 top-full w-80 pt-2 transition-all duration-200',
          isOpen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
        )}
        role="menu"
      >
        <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 p-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 ? (
              <button type="button" onClick={() => void markAllRead()} className="text-xs font-medium text-primary hover:underline" title="Mark all notifications as read">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {isLoading && notifications.length === 0 ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, index) => <span key={index} className="block h-14 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : notifications.length ? notifications.slice(0, 8).map((item) => (
              <Link
                key={item.id}
                href={item.actionUrl || '/account/notifications'}
                onClick={() => {
                  void markRead(item.id);
                  setIsOpen(false);
                }}
                className={cn('flex gap-3 rounded-lg p-3 transition-colors hover:bg-muted', !item.read && 'bg-primary/5')}
                role="menuitem"
                title={item.title}
              >
                <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', item.read ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                  <Package size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-sm font-semibold', !item.read && 'text-primary')}>{item.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{item.message}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                </span>
                {!item.read ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
              </Link>
            )) : (
              <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
            )}
          </div>
          <div className="border-t border-border p-1">
            <Link href="/account/notifications" onClick={() => setIsOpen(false)} className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-muted" title="View all notifications">
              View all notifications
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-lg p-1.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:p-2"
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestions>({
    products: [],
    categories: [],
    brands: [],
    collections: [],
    tags: [],
    popular: [],
    recent: [],
    trending: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length === 1) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError('');
      fetchSearchSuggestions(normalizedQuery, { signal: controller.signal, limit: 5 })
        .then((response) => {
          setSuggestions({
            ...response,
            recent: isAuthenticated ? response.recent : getGuestSearchHistory().slice(0, 5),
          });
          setHasSearched(true);
          setActiveIndex(-1);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === 'CanceledError') return;
          setSuggestions((current) => ({ ...current, products: [], categories: [], brands: [], collections: [], tags: [] }));
          setError('Search suggestions are temporarily unavailable.');
          setHasSearched(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, normalizedQuery === '' ? 0 : 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isAuthenticated, query]);

  const navigableItems = useMemo(() => {
    const entityItem = (item: SearchEntitySuggestion) => ({
      key: `${item.type}-${item.id}`,
      type: item.type,
      id: Number(item.id),
      slug: item.slug,
      label: item.name,
      href: item.type === 'category'
        ? `/shop?category=${encodeURIComponent(item.slug)}`
        : item.type === 'brand'
          ? `/brands/${item.slug}`
          : item.type === 'collection'
            ? `/collections/${item.slug}`
            : `/shop?search=${encodeURIComponent(item.name)}`,
    });
    const keywordItem = (item: SearchKeywordSuggestion, group: 'recent' | 'popular' | 'trending') => ({
      key: `${group}-${item.id}`,
      type: 'keyword' as const,
      id: Number(item.id) || undefined,
      slug: undefined,
      label: item.keyword,
      href: `/shop?search=${encodeURIComponent(item.keyword)}`,
    });

    return [
      ...suggestions.products.map((product) => ({
        key: `product-${product.id}`,
        type: 'product' as const,
        id: Number(product.id),
        slug: product.slug,
        label: product.name,
        href: `/products/${product.slug}`,
      })),
      ...suggestions.categories.map(entityItem),
      ...suggestions.brands.map(entityItem),
      ...suggestions.collections.map(entityItem),
      ...suggestions.tags.map(entityItem),
      ...suggestions.recent.map((item) => keywordItem(item, 'recent')),
      ...suggestions.popular.map((item) => keywordItem(item, 'popular')),
      ...suggestions.trending.map((item) => keywordItem(item, 'trending')),
    ];
  }, [suggestions]);

  const openSuggestion = (item: (typeof navigableItems)[number], position: number) => {
    const keyword = query.trim() || item.label;
    if (!isAuthenticated) {
      setSuggestions((current) => ({ ...current, recent: rememberGuestSearch(keyword).slice(0, 5) }));
    }
    void trackSearchClick({
      query: keyword,
      target_type: item.type,
      target_id: item.id,
      target_slug: item.slug,
      position: position + 1,
    }).then(setSearchAttribution).catch(() => undefined);
    onClose();
    router.push(item.href);
  };

  const submitQuery = () => {
    const normalized = query.trim();
    if (!normalized) return;
    if (!isAuthenticated) rememberGuestSearch(normalized);
    onClose();
    router.push(`/shop?search=${encodeURIComponent(normalized)}`);
  };

  const removeHistory = (item: SearchKeywordSuggestion) => {
    if (isAuthenticated) {
      void removeRecentSearch(item.id).catch(() => undefined);
      setSuggestions((current) => ({ ...current, recent: current.recent.filter((recent) => recent.id !== item.id) }));
      return;
    }
    setSuggestions((current) => ({ ...current, recent: removeGuestSearch(item.id).slice(0, 5) }));
  };

  const clearHistory = () => {
    if (isAuthenticated) {
      void clearRecentSearches().catch(() => undefined);
    } else {
      clearGuestSearchHistory();
    }
    setSuggestions((current) => ({ ...current, recent: [] }));
  };

  const resultCount = suggestions.products.length
    + suggestions.categories.length
    + suggestions.brands.length
    + suggestions.collections.length
    + suggestions.tags.length
    + suggestions.popular.length
    + suggestions.recent.length
    + suggestions.trending.length;
  const highlighted = (value: string) => <HighlightedMatch value={value} query={query} />;
  const entitySections = [
    { key: 'categories', label: 'Categories', icon: Layers3, items: suggestions.categories },
    { key: 'brands', label: 'Brands', icon: Building2, items: suggestions.brands },
    { key: 'collections', label: 'Collections', icon: ShoppingBag, items: suggestions.collections },
    { key: 'tags', label: 'Tags', icon: Tags, items: suggestions.tags },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute top-0 left-0 right-0 bg-background shadow-2xl border-b border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-sm transition focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/15">
            <Search size={20} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
                  return;
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((current) => Math.min(navigableItems.length - 1, current + 1));
                  return;
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((current) => Math.max(-1, current - 1));
                  return;
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  if (activeIndex >= 0 && navigableItems[activeIndex]) {
                    openSuggestion(navigableItems[activeIndex], activeIndex);
                  } else {
                    submitQuery();
                  }
                }
              }}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={resultCount > 0}
              aria-controls="store-search-suggestions"
              aria-activedescendant={activeIndex >= 0 ? `store-search-option-${activeIndex}` : undefined}
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:shadow-none"
            />
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close search"
              title="Close search"
            >
              <X size={20} />
            </button>
          </div>

          {isLoading && (
            <div className="mt-3 space-y-1 pb-2" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg p-2">
                  <span className="h-12 w-12 shrink-0 animate-pulse rounded-lg bg-muted" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </span>
                  <span className="h-4 w-14 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && resultCount > 0 && (
            <div id="store-search-suggestions" role="listbox" className="mt-3 max-h-[min(70vh,38rem)] space-y-3 overflow-y-auto pb-2">
              {suggestions.products.length > 0 ? (
                <SearchSuggestionSection title={query.trim() ? 'Products' : 'Popular Products'} icon={<Package className="h-4 w-4" />}>
                  {suggestions.products.map((product) => {
                    const currentIndex = navigableItems.findIndex((item) => item.key === `product-${product.id}`);
                    return (
                <Link
                  key={product.id}
                  id={`store-search-option-${currentIndex}`}
                  href={`/products/${product.slug}`}
                  role="option"
                  aria-selected={activeIndex === currentIndex}
                  onMouseEnter={() => setActiveIndex(currentIndex)}
                  onClick={(event) => {
                    event.preventDefault();
                    openSuggestion(navigableItems[currentIndex], currentIndex);
                  }}
                  className={cn('group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted', activeIndex === currentIndex && 'bg-muted')}
                >
                  <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={product.thumbnail}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                      {highlighted(product.name)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{product.category}</span>
                      <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{product.rating}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {product.discount ? <span className="mb-0.5 block text-[10px] font-bold text-rose-500">-{product.discount}%</span> : null}
                    <span className="font-semibold text-sm">{formatPrice(product.price)}</span>
                  </div>
                </Link>
                    );
                  })}
                </SearchSuggestionSection>
              ) : null}

              {entitySections.map((section) => section.items.length > 0 ? (
                <SearchSuggestionSection key={section.key} title={section.label} icon={<section.icon className="h-4 w-4" />}>
                  {section.items.map((item) => {
                    const currentIndex = navigableItems.findIndex((option) => option.key === `${item.type}-${item.id}`);
                    return (
                      <Link
                        key={item.id}
                        id={`store-search-option-${currentIndex}`}
                        href={navigableItems[currentIndex].href}
                        role="option"
                        aria-selected={activeIndex === currentIndex}
                        onMouseEnter={() => setActiveIndex(currentIndex)}
                        onClick={(event) => {
                          event.preventDefault();
                          openSuggestion(navigableItems[currentIndex], currentIndex);
                        }}
                        className={cn('flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted', activeIndex === currentIndex && 'bg-muted')}
                      >
                        <span className="min-w-0 truncate font-medium">{highlighted(item.name)}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{item.product_count} products</span>
                      </Link>
                    );
                  })}
                </SearchSuggestionSection>
              ) : null)}

              {suggestions.recent.length > 0 ? (
                <SearchSuggestionSection
                  title="Recent Searches"
                  icon={<Clock className="h-4 w-4" />}
                  action={<button type="button" onClick={clearHistory} className="text-xs font-medium text-primary hover:underline">Clear</button>}
                >
                  {suggestions.recent.map((item) => {
                    const currentIndex = navigableItems.findIndex((option) => option.key === `recent-${item.id}`);
                    return (
                      <div key={item.id} className={cn('flex items-center rounded-lg transition-colors hover:bg-muted', activeIndex === currentIndex && 'bg-muted')}>
                        <button
                          id={`store-search-option-${currentIndex}`}
                          type="button"
                          role="option"
                          aria-selected={activeIndex === currentIndex}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                          onClick={() => openSuggestion(navigableItems[currentIndex], currentIndex)}
                          className="min-w-0 flex-1 px-2 py-2 text-left text-sm font-medium"
                        >
                          {highlighted(item.keyword)}
                        </button>
                        <button type="button" onClick={() => removeHistory(item)} className="mr-1 rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`Remove ${item.keyword} from recent searches`}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </SearchSuggestionSection>
              ) : null}

              {([
                { key: 'popular', title: 'Popular Searches', icon: <Search className="h-4 w-4" />, items: suggestions.popular },
                { key: 'trending', title: 'Trending Searches', icon: <TrendingUp className="h-4 w-4" />, items: suggestions.trending },
              ] as const).map((section) => section.items.length > 0 ? (
                <SearchSuggestionSection key={section.key} title={section.title} icon={section.icon}>
                  {section.items.map((item) => {
                    const currentIndex = navigableItems.findIndex((option) => option.key === `${section.key}-${item.id}`);
                    return (
                      <button
                        key={item.id}
                        id={`store-search-option-${currentIndex}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === currentIndex}
                        onMouseEnter={() => setActiveIndex(currentIndex)}
                        onClick={() => openSuggestion(navigableItems[currentIndex], currentIndex)}
                        className={cn('flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted', activeIndex === currentIndex && 'bg-muted')}
                      >
                        <span className="min-w-0 truncate font-medium">{highlighted(item.keyword)}</span>
                        {item.search_count ? <span className="shrink-0 text-xs text-muted-foreground">{item.search_count.toLocaleString()}</span> : null}
                      </button>
                    );
                  })}
                </SearchSuggestionSection>
              ) : null)}
            </div>
          )}

          {!isLoading && error ? (
            <p className="py-4 text-center text-sm text-destructive">{error}</p>
          ) : null}

          {!isLoading && query.trim().length > 1 && hasSearched && resultCount === 0 && !error && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

        </div>
      </div>
    </div>
  );
}

function SearchSuggestionSection({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1 flex items-center justify-between gap-3 px-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function HighlightedMatch({ value, query }: { value: string; query: string }) {
  const terms = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean))).sort((a, b) => b.length - a.length);
  if (!terms.length) return value;

  const expression = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  return value.split(expression).map((part, index) => (
    terms.some((term) => part.toLocaleLowerCase() === term.toLocaleLowerCase())
      ? <mark key={`${part}-${index}`} className="bg-transparent font-extrabold text-primary">{part}</mark>
      : <span key={`${part}-${index}`}>{part}</span>
  ));
}

function CategoryDropdown({
  categories,
  onClose,
  className,
}: {
  categories: RuntimeCategory[];
  onClose: () => void;
  className?: string;
}) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'bg-background border border-border shadow-xl z-40 animate-in fade-in-0 zoom-in-95 duration-150',
        className
      )}
      role="menu"
      aria-label="Category navigation"
    >
      <div className="max-h-[70vh] overflow-y-auto p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {categories.map((category) => (
            <div key={category.id} className="min-w-0 rounded-lg bg-muted/40 p-3">
              <Link
                href={`/categories/${category.slug}`}
                onClick={onClose}
                role="menuitem"
                className="group flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-background"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold group-hover:text-primary">
                    {category.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {category.product_count} products
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </Link>
              {category.children.length ? (
                <div className="mt-2 grid gap-1">
                  {category.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/categories/${child.slug}`}
                      onClick={onClose}
                      role="menuitem"
                      className="truncate rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-primary"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileCategoryLinks({
  categories,
  onNavigate,
}: {
  categories: RuntimeCategory[];
  onNavigate: () => void;
}) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 rounded-xl bg-muted/40 p-2">
      {categories.map((category) => (
        <div key={category.id}>
          <Link
            href={`/categories/${category.slug}`}
            onClick={onNavigate}
            className="block truncate rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-background"
          >
            {category.name}
          </Link>
          {category.children.length ? (
            <div className="ml-3 border-l border-border pl-2">
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  onClick={onNavigate}
                  className="block truncate rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-primary"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function HeaderSkeleton({ isScrolled }: { isScrolled: boolean }) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background/95 backdrop-blur transition-shadow duration-200',
        isScrolled ? 'shadow-md' : 'border-b border-border'
      )}
      aria-busy="true"
    >
      <div className="hidden md:block bg-muted/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <div className="h-4 w-44 animate-pulse rounded bg-muted" />
          <div className="flex items-center gap-4">
            <span className="h-4 w-16 animate-pulse rounded bg-muted" />
            <span className="h-4 w-10 animate-pulse rounded bg-muted" />
            <span className="h-4 w-8 animate-pulse rounded bg-muted" />
            <span className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="flex h-16 min-w-0 items-center gap-1 sm:gap-3 md:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:w-40 sm:flex-none md:w-48">
            <span className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <span className="h-5 w-16 max-w-full animate-pulse rounded bg-muted sm:w-24" />
          </div>
          <div className="ml-4 hidden items-center gap-1 xl:flex">
            <span className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="mx-4 hidden max-w-lg flex-1 md:block">
            <span className="block h-11 w-full animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-1 lg:ml-0">
            <span className="h-8 w-8 animate-pulse rounded-lg bg-muted sm:h-9 sm:w-9 md:hidden" />
            <span className="h-8 w-8 animate-pulse rounded-lg bg-muted sm:h-9 sm:w-9" />
            <span className="h-8 w-8 animate-pulse rounded-lg bg-muted sm:h-9 sm:w-9" />
            <span className="h-8 w-8 animate-pulse rounded-lg bg-muted sm:h-9 sm:w-9" />
            <span className="hidden h-9 w-9 animate-pulse rounded-lg bg-muted md:block" />
            <span className="h-8 w-8 animate-pulse rounded-lg bg-muted sm:h-9 sm:w-9 xl:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const cartItemCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const cartInitialized = useCartStore((s) => s.initialized);
  const wishlistItemCount = useWishlistStore((s) => s.items.length);
  const wishlistInitialized = useWishlistStore((s) => s.initialized);
  const initializeCart = useCartStore((s) => s.initialize);
  const initializeWishlist = useWishlistStore((s) => s.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authInitialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const branding = useSettingsStore(selectBranding);
  const blogSettings = useSettingsStore(selectBlogSettings);
  useSettingsStore(selectCurrencyFingerprint);

  useEffect(() => {
    let active = true;

    async function bootstrapNavbar() {
      await fetchCurrentUser().catch(() => null);
      if (!active) {
        return;
      }

      await Promise.all([
        initializeCart().catch(() => undefined),
        initializeWishlist().catch(() => undefined),
      ]);
    }

    void bootstrapNavbar();

    return () => {
      active = false;
    };
  }, [fetchCurrentUser, initializeCart, initializeWishlist]);
  const settingsNavLinks = useSettingsStore(selectFrontendNavigation);
  const categoryDisplay = useSettingsStore(selectCategoryDisplaySettings);
  const runtimeCategories = useSettingsStore(selectRuntimeCategories);
  const isSettingsLoading = useSettingsStore(selectSettingsPending);
  const navLinks = settingsNavLinks.length ? settingsNavLinks : NAV_LINKS;
  const navbarCategories = useMemo(
    () =>
      runtimeCategories
        .filter((category) => category.show_in_navbar)
        .map((category) => ({
          ...category,
          children: category.children
            .filter((child) => child.show_in_navbar)
            .slice()
            .sort((a, b) => a.navbar_display_order - b.navbar_display_order || a.name.localeCompare(b.name)),
        }))
        .slice()
        .sort((a, b) => a.navbar_display_order - b.navbar_display_order || a.name.localeCompare(b.name)),
    [runtimeCategories]
  );
  const supportPhone = branding?.support_phone || branding?.company_phone;
  const supportAddress = branding?.address;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isCategoryDropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!categoryDropdownRef.current?.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryDropdownOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  async function handleSignOut() {
    await logout();
    setIsAccountMenuOpen(false);
    router.push('/');
  }

  const isNavbarLoading =
    isSettingsLoading || !authInitialized || !cartInitialized || !wishlistInitialized;

  if (isNavbarLoading) {
    return <HeaderSkeleton isScrolled={isScrolled} />;
  }

  return (
    <>
      {isAuthenticated ? <RealtimeNotifications /> : null}
      {isSearchOpen && <SearchOverlay onClose={() => setIsSearchOpen(false)} />}

      <header
        className={cn(
          'sticky top-0 z-40 bg-background/95 backdrop-blur transition-shadow duration-200',
          isScrolled ? 'shadow-md' : 'border-b border-border'
        )}
      >
        {/* Top bar */}
        <div className="hidden md:block bg-muted/50 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              {supportPhone ? (
                <span className="flex items-center gap-1">
                  <Phone size={12} /> {supportPhone}
                </span>
              ) : null}
              {supportAddress ? (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {supportAddress}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-4">
              <Link href="/order-tracking" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Package size={12} /> Track Order
              </Link>
              <Link href="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              {blogSettings.enabled ? (
                <Link href="/blogs" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              ) : null}
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          <div className="flex h-16 min-w-0 items-center gap-1 sm:gap-3 md:gap-4">
            {/* Logo */}
            <div className="min-w-0 flex-1 sm:w-40 sm:flex-none md:w-48">
              <BrandLogo
                href="/"
                className="max-w-full"
                textClassName="text-base tracking-tight sm:text-xl"
              />
            </div>

            {/* Desktop nav */}
            <nav className="ml-4 hidden items-center gap-1 xl:flex">
              {isSettingsLoading ? (
                <>
                  <span className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
                  <span className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
                  <span className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
                </>
              ) : null}
              {!isSettingsLoading && navLinks.map((link) => {
                const isCategoriesLink = 'module' in link && link.module === 'categories' || link.href === '/categories';
                if (isCategoriesLink && categoryDisplay.navbar_dropdown_enabled && navbarCategories.length > 0) {
                  return (
                    <div
                      key={`${link.href}-${link.label}`}
                      className="relative"
                      ref={categoryDropdownRef}
                    >
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-primary"
                        aria-expanded={isCategoryDropdownOpen}
                        aria-haspopup="menu"
                        onClick={() => setIsCategoryDropdownOpen((open) => !open)}
                        onKeyDown={(event) => {
                          if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setIsCategoryDropdownOpen(true);
                          }
                        }}
                      >
                        {link.label}
                        <ChevronDown
                          size={14}
                          className={cn(
                            'transition-transform',
                            isCategoryDropdownOpen && 'rotate-180'
                          )}
                        />
                      </button>
                      {isCategoryDropdownOpen && (
                        <CategoryDropdown
                          categories={navbarCategories}
                          onClose={() => setIsCategoryDropdownOpen(false)}
                          className="absolute left-0 top-full mt-2 w-[min(46rem,calc(100vw-2rem))] rounded-xl"
                        />
                      )}
                    </div>
                  );
                }
                return (
                  <Link
                    key={`${link.href}-${link.label}`}
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-primary"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Search bar */}
            <div className="flex-1 max-w-lg mx-4 hidden md:block">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-background"
                title="Search products, brands, and categories (⌘K)"
              >
                <Search size={16} />
                <span>Search...</span>
                <kbd className="ml-auto text-xs bg-background border border-border rounded px-1.5 py-0.5">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Actions */}
            <div className="ml-auto flex shrink-0 items-center gap-0 sm:gap-1 xl:ml-0">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="rounded-lg p-1.5 transition-colors hover:bg-muted sm:p-2 md:hidden"
                aria-label="Search"
                title="Search"
              >
                <Search size={20} />
              </button>

              <ThemeToggle />

              {isAuthenticated ? (
                <Link
                  href="/wishlist"
                  className="relative rounded-lg p-1.5 transition-colors hover:bg-muted sm:p-2"
                  aria-label="Wishlist"
                  title="Wishlist"
                >
                  <Heart size={20} />
                  {wishlistItemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
                      {wishlistItemCount > 9 ? '9+' : wishlistItemCount}
                    </span>
                  )}
                </Link>
              ) : null}

              <Link
                href="/cart"
                className="relative rounded-lg p-1.5 transition-colors hover:bg-muted sm:p-2"
                aria-label="Cart"
                title="Shopping Cart"
              >
                <ShoppingCart size={20} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </Link>

              {isAuthenticated && user ? (
                <NavbarNotificationBell onOpen={() => setIsAccountMenuOpen(false)} />
              ) : null}

              {/* User Menu */}
              {isAuthenticated && user ? (
                <div
                  ref={accountMenuRef}
                  className="relative hidden md:block"
                  onMouseEnter={() => setIsAccountMenuOpen(true)}
                  onMouseLeave={() => setIsAccountMenuOpen(false)}
                >
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg transition-colors hover:bg-muted"
                    aria-label="Account"
                    title="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    onClick={() => setIsAccountMenuOpen((open) => !open)}
                  >
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        width={28}
                        height={28}
                        unoptimized
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <User size={20} />
                    )}
                  </button>
                  <div
                    className={cn(
                      "absolute right-0 top-full w-56 pt-2 transition-all duration-200",
                      isAccountMenuOpen
                        ? "visible translate-y-0 opacity-100"
                        : "invisible -translate-y-1 opacity-0"
                    )}
                    role="menu"
                  >
                    <div className="bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                      <div className="p-3 border-b border-border bg-muted/50">
                        <p className="font-semibold text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="p-1">
                        {[
                          { icon: LayoutDashboard, label: 'Dashboard', href: '/account' },
                          { icon: Package, label: 'My Orders', href: '/account/orders' },
                          { icon: Bell, label: 'Notifications', href: '/account/notifications' },
                          { icon: Settings, label: 'Settings', href: '/account/settings' },
                        ].map(({ icon: Icon, label, href }) => (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setIsAccountMenuOpen(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                            role="menuitem"
                            title={label}
                          >
                            <Icon size={15} className="text-muted-foreground" />
                            {label}
                          </Link>
                        ))}
                      </div>
                      <div className="p-1 border-t border-border">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
                          role="menuitem"
                          title="Sign Out"
                        >
                          <LogOut size={15} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg p-2 transition-colors hover:bg-muted hidden md:block"
                  aria-label="Account"
                  title="Sign in"
                >
                  <User size={20} />
                </Link>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-1.5 transition-colors hover:bg-muted sm:p-2 xl:hidden"
                aria-label="Menu"
                title="Open menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute bottom-0 left-0 top-0 flex w-[min(20rem,calc(100vw-2rem))] flex-col bg-background shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="min-w-0 max-w-[14rem]"
                title="Home"
              >
                <BrandLogo textClassName="text-xl" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 transition-colors hover:bg-muted"
                aria-label="Close menu"
                title="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4">
                <button
                  onClick={() => {
                    setIsSearchOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-background"
                >
                  <Search size={16} />
                  <span>Search...</span>
                </button>
              </div>
              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const isCategoriesLink = 'module' in link && link.module === 'categories' || link.href === '/categories';
                  if (isCategoriesLink && categoryDisplay.navbar_dropdown_enabled && navbarCategories.length > 0) {
                    return (
                      <div key={`${link.href}-${link.label}`} className="space-y-2">
                        <p className="px-4 py-2 font-medium">{link.label}</p>
                        <MobileCategoryLinks
                          categories={navbarCategories}
                          onNavigate={() => setIsMobileMenuOpen(false)}
                        />
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={`${link.href}-${link.label}`}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block rounded-xl px-4 py-3 font-medium transition-colors hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-4 pt-4 border-t border-border space-y-1">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/account"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <User size={18} /> My Account
                    </Link>
                    <Link
                      href="/account/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <Package size={18} /> My Orders
                    </Link>
                  </>
                ) : null}
                {isAuthenticated ? (
                  <Link
                    href="/wishlist"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <Heart size={18} /> Wishlist {wishlistItemCount > 0 && `(${wishlistItemCount})`}
                  </Link>
                ) : null}
                <Link
                  href="/order-tracking"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted"
                >
                  <Package size={18} /> Track Order
                </Link>
              </div>
            </div>
            <div className="p-4 border-t border-border">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={async () => {
                    await handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

