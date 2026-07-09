'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { BrandLogo } from '@/components/settings/BrandLogo';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { useAuthStore } from '@/store/auth-store';
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
import { fetchProducts } from '@/services/catalog-service';
import type { Product } from '@/types';
import type { RuntimeCategory } from '@/types/settings';
import Image from 'next/image';
import { cn } from '@/lib/utils';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-lg p-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length <= 1) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      fetchProducts(
        {
          search: normalizedQuery,
          page: 1,
          per_page: 5,
        },
        { signal: controller.signal },
      )
        .then((response) => {
          setResults(response.items);
          setHasSearched(true);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === 'CanceledError') return;
          setResults([]);
          setHasSearched(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute top-0 left-0 right-0 bg-background shadow-2xl border-b border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 ring-1 ring-transparent transition focus-within:bg-background focus-within:ring-primary/20">
            <Search size={20} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products, brands, categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:shadow-none"
            />
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close search"
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

          {!isLoading && results.length > 0 && (
            <div className="mt-3 space-y-1 pb-2">
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={onClose}
                  className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image
                      src={product.thumbnail}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <span className="font-semibold text-sm">{formatPrice(product.price)}</span>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && query.length > 1 && hasSearched && results.length === 0 && (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Popular Searches
            </p>
            <div className="flex flex-wrap gap-2">
              {['Sneakers', 'Headphones', 'Backpack', 'Smartwatch', 'Keyboard'].map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
        {categories.length ? (
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
        ) : (
          <p className="px-2 py-4 text-sm text-muted-foreground">No categories available.</p>
        )}
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
  return (
    <div className="space-y-1 rounded-xl bg-muted/40 p-2">
      {categories.length ? (
        categories.map((category) => (
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
        ))
      ) : (
        <p className="px-3 py-2 text-sm text-muted-foreground">No categories available.</p>
      )}
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
            <span className="h-4 w-10 animate-pulse rounded bg-muted" />
            <span className="h-4 w-8 animate-pulse rounded bg-muted" />
            <span className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16 gap-4">
          <div className="flex w-32 shrink-0 items-center gap-2 sm:w-40 md:w-48">
            <span className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <span className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="ml-4 hidden items-center gap-1 lg:flex">
            <span className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="mx-4 hidden max-w-lg flex-1 md:block">
            <span className="block h-11 w-full animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <span className="h-9 w-9 animate-pulse rounded-lg bg-muted md:hidden" />
            <span className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <span className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
            <span className="hidden h-9 w-9 animate-pulse rounded-lg bg-muted md:block" />
            <span className="h-9 w-9 animate-pulse rounded-lg bg-muted lg:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function Header() {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const cartItemCount = useCartStore((s) => s.getItemCount());
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
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <BrandLogo
              href="/"
              className="w-32 shrink-0 sm:w-40 md:w-48"
              textClassName="text-lg tracking-tight sm:text-xl"
            />

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {isSettingsLoading ? (
                <>
                  <span className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
                  <span className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
                  <span className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
                </>
              ) : null}
              {!isSettingsLoading && navLinks.map((link) => {
                const isCategoriesLink = 'module' in link && link.module === 'categories' || link.href === '/categories';
                if (isCategoriesLink && categoryDisplay.navbar_dropdown_enabled) {
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
                className="flex w-full items-center gap-3 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
              >
                <Search size={16} />
                <span>Search products...</span>
                <kbd className="ml-auto text-xs bg-background border border-border rounded px-1.5 py-0.5">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-auto lg:ml-0">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="rounded-lg p-2 transition-colors hover:bg-muted md:hidden"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              <ThemeToggle />

              <Link
                href="/wishlist"
                className="relative rounded-lg p-2 transition-colors hover:bg-muted"
                aria-label="Wishlist"
              >
                <Heart size={20} />
                {wishlistItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
                    {wishlistItemCount > 9 ? '9+' : wishlistItemCount}
                  </span>
                )}
              </Link>

              <Link
                href="/cart"
                className="relative rounded-lg p-2 transition-colors hover:bg-muted"
                aria-label="Cart"
              >
                <ShoppingCart size={20} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                    {cartItemCount > 9 ? '9+' : cartItemCount}
                  </span>
                )}
              </Link>

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
                    className="rounded-lg p-2 transition-colors hover:bg-muted"
                    aria-label="Account"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    onClick={() => setIsAccountMenuOpen((open) => !open)}
                  >
                    <User size={20} />
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
                >
                  <User size={20} />
                </Link>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="rounded-lg p-2 transition-colors hover:bg-muted lg:hidden"
                aria-label="Menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
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
              >
                <BrandLogo textClassName="text-xl" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-lg p-2 transition-colors hover:bg-muted"
                aria-label="Close menu"
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
                  className="flex w-full items-center gap-3 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/80"
                >
                  <Search size={16} />
                  <span>Search...</span>
                </button>
              </div>
              <nav className="space-y-1">
                {navLinks.map((link) => {
                  const isCategoriesLink = 'module' in link && link.module === 'categories' || link.href === '/categories';
                  if (isCategoriesLink && categoryDisplay.navbar_dropdown_enabled) {
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
                <Link
                  href={isAuthenticated ? "/account" : "/login"}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted"
                >
                  <User size={18} /> My Account
                </Link>
                {isAuthenticated ? (
                  <Link
                    href="/account/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <Package size={18} /> My Orders
                  </Link>
                ) : null}
                <Link
                  href="/wishlist"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted"
                >
                  <Heart size={18} /> Wishlist {wishlistItemCount > 0 && `(${wishlistItemCount})`}
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

