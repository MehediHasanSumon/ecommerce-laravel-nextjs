'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { toast } from 'sonner';

export default function SettingsPage() {
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
          <span className="text-foreground font-medium">Settings</span>
        </nav>
        <div className="flex gap-8">
          <AccountSidebar active="settings" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">Account Settings</h1>

            <div className="space-y-4">
              {[
                {
                  title: 'Privacy Settings',
                  desc: 'Control who can see your profile and activity',
                  section: 'privacy',
                },
                {
                  title: 'Security',
                  desc: 'Manage two-factor authentication and active sessions',
                  section: 'security',
                },
                {
                  title: 'Language & Region',
                  desc: 'Set your preferred language and currency',
                  section: 'language',
                },
                {
                  title: 'Data & Personalization',
                  desc: 'Manage your data and personalization preferences',
                  section: 'data',
                },
              ].map(({ title, desc, section }) => (
                <div
                  key={section}
                  className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <div>
                    <h2 className="font-semibold text-sm">{title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => toast(`${title} settings coming soon!`)}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Manage →
                  </button>
                </div>
              ))}

              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5">
                <h2 className="font-bold text-destructive mb-2">Danger Zone</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Deactivate Account', desc: 'Temporarily disable your account' },
                    {
                      label: 'Delete Account',
                      desc: 'Permanently remove your account and all data',
                    },
                  ].map(({ label, desc }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <button
                        onClick={() => toast.error(`${label} is disabled in demo mode`)}
                        className="px-4 py-2 border border-destructive text-destructive rounded-xl text-xs font-semibold hover:bg-destructive hover:text-white transition-colors"
                      >
                        {label}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
