'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Bell, Package, Tag, Info, Star, Check } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { toast } from 'sonner';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'order',
    icon: Package,
    title: 'Your order has shipped!',
    message: 'Order LX-20250612-8821 is on its way. Track your package.',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'promo',
    icon: Tag,
    title: 'Flash Sale starts in 1 hour',
    message: "Don't miss up to 40% off on select electronics and footwear.",
    time: '5 hours ago',
    read: false,
  },
  {
    id: '3',
    type: 'order',
    icon: Package,
    title: 'Order delivered successfully',
    message: 'Your order LX-20250601-5543 was delivered. How was your experience?',
    time: '2 days ago',
    read: true,
  },
  {
    id: '4',
    type: 'review',
    icon: Star,
    title: 'Review your recent purchase',
    message: 'Share your thoughts on Air Max Pulse Sneakers.',
    time: '3 days ago',
    read: true,
  },
  {
    id: '5',
    type: 'system',
    icon: Info,
    title: 'Password changed',
    message: "Your account password was recently changed. If this wasn't you, contact support.",
    time: '1 week ago',
    read: true,
  },
];

const PREFERENCES = [
  {
    id: 'orders',
    label: 'Order Updates',
    desc: 'Shipping, delivery, and order status notifications',
  },
  {
    id: 'promos',
    label: 'Promotions & Deals',
    desc: 'Flash sales, coupon codes, and special offers',
  },
  { id: 'reviews', label: 'Review Requests', desc: 'Reminders to review purchased products' },
  { id: 'newsletter', label: 'Newsletter', desc: 'Weekly curated content and new arrivals' },
  { id: 'sms', label: 'SMS Notifications', desc: 'Text message alerts for critical updates' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    orders: true,
    promos: true,
    reviews: true,
    newsletter: false,
    sms: false,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/account" className="hover:text-foreground">
            Account
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Notifications</span>
        </nav>

        <div className="flex gap-8">
          <AccountSidebar active="notifications" />
          <div className="flex-1 min-w-0 space-y-6">
            {/* Notifications List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-extrabold flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({unreadCount} unread)
                    </span>
                  )}
                </h1>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Check size={13} /> Mark all read
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {notifications.map(({ id, icon: Icon, title, message, time, read }) => (
                  <div
                    key={id}
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
                      )
                    }
                    className={`flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-colors hover:bg-muted/50 ${read ? 'border-border bg-card' : 'border-primary/20 bg-primary/5'}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${read ? 'bg-muted' : 'bg-primary/10'}`}
                    >
                      <Icon size={18} className={read ? 'text-muted-foreground' : 'text-primary'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${read ? '' : 'text-primary'}`}>
                        {title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{time}</p>
                    </div>
                    {!read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-bold mb-5 flex items-center gap-2">
                <Bell size={16} /> Notification Preferences
              </h2>
              <div className="space-y-4">
                {PREFERENCES.map(({ id, label, desc }) => (
                  <div key={id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        setPrefs((p) => ({ ...p, [id]: !p[id] }));
                        toast(prefs[id] ? `${label} disabled` : `${label} enabled`);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs[id] ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${prefs[id] ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
