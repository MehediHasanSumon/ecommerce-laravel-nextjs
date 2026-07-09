"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Camera, Save } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { accountService, type AccountProfile } from "@/services/account-service";
import { getInitials } from "@/utils/sanitize";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", birthDate: "", gender: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", password: "", confirmation: "" });

  useEffect(() => {
    accountService.profile()
      .then((next) => {
        setProfile(next);
        setForm({
          name: next.name ?? "",
          email: next.email ?? "",
          phone: next.phone ?? "",
          birthDate: next.dateOfBirth ?? "",
          gender: next.gender ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const next = await accountService.updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
        date_of_birth: form.birthDate,
        gender: form.gender,
      });
      setProfile(next);
      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(event: React.FormEvent) {
    event.preventDefault();
    try {
      await accountService.changePassword({
        current_password: passwordForm.current,
        password: passwordForm.password,
        password_confirmation: passwordForm.confirmation,
      });
      setPasswordForm({ current: "", password: "", confirmation: "" });
      toast.success("Password changed.");
    } catch {
      toast.error("Unable to change password.");
    }
  }

  if (loading) {
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
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={14} />
          <Link href="/account" className="hover:text-foreground">Account</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">Profile</span>
        </nav>

        <div className="flex gap-8">
          <AccountSidebar active="profile" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">Profile Settings</h1>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-5 mb-8 pb-8 border-b border-border">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    <span className="text-xl font-extrabold text-primary">{getInitials(profile?.name ?? "User")}</span>
                  </div>
                  <button type="button" className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 shadow-md">
                    <Camera size={12} />
                  </button>
                </div>
                <div>
                  <p className="font-bold">{profile?.name}</p>
                  <p className="text-sm text-muted-foreground">Member since {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString() : "Not available"}</p>
                  <p className="text-xs text-primary mt-1">{profile?.membershipLevel ?? "Member"}</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { label: "Full Name", key: "name", type: "text", placeholder: "Enter full name" },
                    { label: "Email Address", key: "email", type: "email", placeholder: "Enter email address" },
                    { label: "Phone Number", key: "phone", type: "tel", placeholder: "Enter phone number" },
                    { label: "Gender", key: "gender", type: "text", placeholder: "Enter gender" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold mb-2">{label}</label>
                      <input
                        type={type}
                        value={form[key as keyof typeof form]}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors"
                      />
                    </div>
                  ))}
                  <DatePicker label="Date of Birth" value={form.birthDate} onChange={(value) => setForm((current) => ({ ...current, birthDate: value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
                    <Save size={15} /> Save Changes
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 mt-4">
              <h2 className="font-bold mb-5">Change Password</h2>
              <form onSubmit={handlePassword} className="space-y-4">
                {[
                  { label: "Current Password", key: "current", placeholder: "Enter current password" },
                  { label: "New Password", key: "password", placeholder: "At least 8 characters" },
                  { label: "Confirm New Password", key: "confirmation", placeholder: "Repeat new password" },
                ].map(({ label, key, placeholder }) => (
                  <div key={label}>
                    <label className="block text-sm font-semibold mb-2">{label}</label>
                    <input
                      type="password"
                      value={passwordForm[key as keyof typeof passwordForm]}
                      onChange={(event) => setPasswordForm((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors"
                    />
                  </div>
                ))}
                <button type="submit" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
