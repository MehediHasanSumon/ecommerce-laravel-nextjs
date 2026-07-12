'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { toast } from 'sonner';
import { accountService, type AccountSettings } from '@/services/account-service';
import { hasPermission } from '@/lib/permissions';

const defaultSettings: AccountSettings = {
  email_notifications: true,
  order_updates: true,
  promotional_notifications: false,
  account_notifications: true,
  review_requests: true,
  newsletter: false,
  sms_notifications: false,
  product_recommendations: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AccountSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [settingsSavingKey, setSettingsSavingKey] = useState<keyof AccountSettings | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const canEditSettings = hasPermission('can_edit_account_settings');

  useEffect(() => {
    accountService
      .settings()
      .then(setSettings)
      .catch(() => toast.error('Could not load account settings.'))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async (key: keyof AccountSettings, next: AccountSettings) => {
    if (!canEditSettings) return;
    setSettings(next);
    setSettingsSavingKey(key);
    try {
      const saved = await accountService.updateSettings(next);
      setSettings(saved);
      toast.success('Account settings saved.');
    } catch {
      toast.error('Unable to save account settings.');
    } finally {
      setSettingsSavingKey(null);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditSettings) return;
    setPasswordSaving(true);
    try {
      await accountService.changePassword(passwordForm);
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      toast.success('Password changed.');
    } catch {
      toast.error('Unable to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={14} />
          <Link href="/account" className="hover:text-foreground">Account</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Settings</span>
        </nav>
        <div className="flex gap-8">
          <AccountSidebar active="settings" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">Account Settings</h1>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-24 bg-muted rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    title: 'Email Notifications',
                    desc: 'Receive account and shopping updates by email',
                    key: 'email_notifications',
                  },
                  {
                    title: 'Order Updates',
                    desc: 'Receive notifications for order, payment, and shipping changes',
                    key: 'order_updates',
                  },
                  {
                    title: 'Promotional Notifications',
                    desc: 'Receive campaign, discount, and product recommendation messages',
                    key: 'promotional_notifications',
                  },
                  {
                    title: 'Account Notifications',
                    desc: 'Receive important security and account activity messages',
                    key: 'account_notifications',
                  },
                  {
                    title: 'Review Requests',
                    desc: 'Receive reminders to review purchased products',
                    key: 'review_requests',
                  },
                  {
                    title: 'Newsletter',
                    desc: 'Receive weekly curated content and new arrival updates',
                    key: 'newsletter',
                  },
                  {
                    title: 'SMS Notifications',
                    desc: 'Receive text message alerts for critical account and order updates',
                    key: 'sms_notifications',
                  },
                  {
                    title: 'Product Recommendations',
                    desc: 'Receive personalized product suggestions based on your activity',
                    key: 'product_recommendations',
                  },
                ].map(({ title, desc, key }) => (
                  (() => {
                    const settingKey = key as keyof AccountSettings;
                    const checked = Boolean(settings[settingKey]);
                    const isSavingThis = settingsSavingKey === settingKey;

                    return (
                  <div
                    key={key}
                    className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
                  >
                    <div>
                      <h2 className="font-semibold text-sm">{title}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!canEditSettings || Boolean(settingsSavingKey)}
                      onClick={() => void saveSettings(settingKey, { ...settings, [settingKey]: !checked })}
                      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-60 ${checked ? 'bg-primary' : 'bg-muted'}`}
                      aria-pressed={checked}
                      aria-busy={isSavingThis}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'left-6' : 'left-1'}`}
                      />
                    </button>
                  </div>
                    );
                  })()
                ))}

                {canEditSettings ? <form onSubmit={changePassword} className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-sm">Security</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-4">Change your account password securely.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      ['current_password', 'Current Password'],
                      ['password', 'New Password'],
                      ['password_confirmation', 'Confirm Password'],
                    ].map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                        <input
                          type="password"
                          value={passwordForm[key as keyof typeof passwordForm]}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, [key]: event.target.value }))}
                          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          required
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {passwordSaving ? 'Saving...' : 'Update Password'}
                    </button>
                  </div>
                </form> : null}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
