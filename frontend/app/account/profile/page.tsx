'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Camera, Save } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1 (555) 123-4567',
    birthDate: '',
    bio: '',
  });
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <AnnouncementBar />
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-10">
          <div className="h-96 bg-muted rounded-2xl animate-pulse" />
        </main>
        <Footer />
      </div>
    );
  }

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
          <span className="text-foreground font-medium">Profile</span>
        </nav>

        <div className="flex gap-8">
          <AccountSidebar active="profile" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">Profile Settings</h1>
            <div className="bg-card border border-border rounded-2xl p-6">
              {/* Avatar */}
              <div className="flex items-center gap-5 mb-8 pb-8 border-b border-border">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-muted">
                    <Image
                      src="https://i.pravatar.cc/150?img=12"
                      alt="Avatar"
                      width={80}
                      height={80}
                      className="object-cover"
                    />
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 shadow-md">
                    <Camera size={12} />
                  </button>
                </div>
                <div>
                  <p className="font-bold">{form.name}</p>
                  <p className="text-sm text-muted-foreground">Member since June 2026</p>
                  <button className="text-xs text-primary hover:underline mt-1">
                    Change photo
                  </button>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                    {
                      label: 'Email Address',
                      key: 'email',
                      type: 'email',
                      placeholder: 'john@example.com',
                    },
                    {
                      label: 'Phone Number',
                      key: 'phone',
                      type: 'tel',
                      placeholder: '+1 (555) 000-0000',
                    },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold mb-2">{label}</label>
                      <input
                        type={type}
                        value={form[key as keyof typeof form]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors"
                      />
                    </div>
                  ))}
                  <DatePicker
                    label="Date of Birth"
                    value={form.birthDate}
                    onChange={(value) => setForm((f) => ({ ...f, birthDate: value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    placeholder="Tell us a little about yourself..."
                    rows={3}
                    className="w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    <Save size={15} /> Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => toast('Changes discarded')}
                    className="px-6 py-3 border border-border rounded-xl font-semibold text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-card border border-border rounded-2xl p-6 mt-4">
              <h2 className="font-bold mb-5">Change Password</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.success('Password changed!');
                }}
                className="space-y-4"
              >
                {[
                  { label: 'Current Password', placeholder: 'Enter current password' },
                  { label: 'New Password', placeholder: 'At least 8 characters' },
                  { label: 'Confirm New Password', placeholder: 'Repeat new password' },
                ].map(({ label, placeholder }) => (
                  <div key={label}>
                    <label className="block text-sm font-semibold mb-2">{label}</label>
                    <input
                      type="password"
                      placeholder={placeholder}
                      className="w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Update Password
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-card border border-destructive/30 rounded-2xl p-6 mt-4">
              <h2 className="font-bold text-destructive mb-2">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => toast.error('Account deletion is disabled in demo mode')}
                className="px-5 py-2.5 border border-destructive text-destructive rounded-xl text-sm font-semibold hover:bg-destructive hover:text-white transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
