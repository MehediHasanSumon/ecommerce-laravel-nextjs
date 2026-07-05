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
  CreditCard,
  Bell,
  Star,
  Settings,
  LogOut,
} from 'lucide-react';
import { routePaths } from '@/constants/routes';
import { useAuthStore } from '@/store/auth-store';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/account', icon: LayoutDashboard },
  { id: 'orders', label: 'My Orders', href: '/account/orders', icon: ShoppingBag },
  { id: 'wishlist', label: 'Wishlist', href: '/wishlist', icon: Heart },
  { id: 'profile', label: 'Profile', href: '/account/profile', icon: User },
  { id: 'addresses', label: 'Addresses', href: '/account/addresses', icon: MapPin },
  { id: 'payment', label: 'Payment Methods', href: '/account/payment', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', href: '/account/notifications', icon: Bell },
  { id: 'reviews', label: 'My Reviews', href: '/account/reviews', icon: Star },
  { id: 'settings', label: 'Settings', href: '/account/settings', icon: Settings },
];

interface AccountSidebarProps {
  active?: string;
}

export function AccountSidebar({ active }: AccountSidebarProps) {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    router.push(routePaths.home);
    router.refresh();
  }

  return (
    <aside className="hidden md:block w-60 shrink-0">
      <div className="sticky top-24">
        {/* User Card */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full mx-auto mb-3 flex items-center justify-center overflow-hidden">
            <Image
              src="https://i.pravatar.cc/150?img=12"
              alt="User"
              width={64}
              height={64}
              className="rounded-full"
            />
          </div>
          <p className="font-bold text-sm">John Doe</p>
          <p className="text-xs text-muted-foreground">john@example.com</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="text-xs font-semibold text-amber-500">Gold Member</span>
            <Star size={11} className="fill-amber-500 text-amber-500" />
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-card border border-border rounded-2xl p-2">
          {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => (
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
