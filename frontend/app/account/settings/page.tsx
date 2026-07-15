'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { toast } from 'sonner';
import { accountService } from '@/services/account-service';

export default function SettingsPage() {
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
          <AccountSidebar active="settings" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">Account Settings</h1>

            <form onSubmit={changePassword} className="bg-card border border-border rounded-2xl p-5">
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
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
