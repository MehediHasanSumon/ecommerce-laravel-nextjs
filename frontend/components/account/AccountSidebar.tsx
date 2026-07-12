'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  User,
  MapPin,
  Bell,
  Star,
  Settings,
  LogOut,
} from 'lucide-react';
import { routePaths } from '@/constants/routes';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth-store';
import { getInitials } from '@/utils/sanitize';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: routePaths.accountDashboard, icon: LayoutDashboard, permission: 'can_view_account_dashboard' },
  { id: 'orders', label: 'My Orders', href: routePaths.accountOrders, icon: ShoppingBag, permission: 'can_view_order' },
  { id: 'wishlist', label: 'Wishlist', href: routePaths.wishlist, icon: Heart, permission: 'can_view_wishlist' },
  { id: 'profile', label: 'Profile', href: routePaths.accountProfile, icon: User, permission: 'can_view_account_profile' },
  { id: 'addresses', label: 'Addresses', href: routePaths.accountAddresses, icon: MapPin, permission: 'can_view_address' },
  { id: 'notifications', label: 'Notifications', href: routePaths.accountNotifications, icon: Bell, permission: 'can_view_notification' },
  { id: 'reviews', label: 'My Reviews', href: routePaths.accountReviews, icon: Star, permission: 'can_view_review' },
  { id: 'settings', label: 'Settings', href: routePaths.accountSettings, icon: Settings, permission: 'can_view_account_settings' },
];

interface AccountSidebarProps {
  active?: string;
}

export function AccountSidebar({ active }: AccountSidebarProps) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  useAuthStore((state) => state.user?.permissions);
  const items = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  async function handleLogout() {
    await logout();
    router.push(routePaths.home);
  }

  return (
    <aside className="hidden md:block w-60 shrink-0">
      <div className="sticky top-24">
        {/* User Card */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name}
                width={64}
                height={64}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-extrabold text-primary">{getInitials(user?.name ?? 'User')}</span>
            )}
          </div>
          <p className="font-bold text-sm">{user?.name ?? 'Customer'}</p>
          <p className="text-xs text-muted-foreground">{user?.email ?? ''}</p>
        </div>

        {/* Navigation */}
        <div className="bg-card border border-border rounded-2xl p-2">
          {items.map(({ id, label, href, icon: Icon }) => (
            <Link
              key={id}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 last:mb-0 ${
                active === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          ))}
          <div className="border-t border-border mt-2 pt-2">
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={16} className="shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
