"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Camera, Save } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountService, type AccountProfile } from "@/services/account-service";
import { useAuthStore } from "@/store/auth-store";
import { getInitials } from "@/utils/sanitize";

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const profileFieldClass =
  "w-full px-4 py-3 bg-background border border-border rounded-xl text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-100";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", birthDate: "", gender: "" });
  const authUser = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    accountService.profile()
      .then((next) => {
        setProfile(next);
        const currentAuthUser = useAuthStore.getState().user;
        setAuthUser({
          id: next.id,
          name: next.name,
          email: next.email,
          avatar: next.avatar ?? null,
          roles: currentAuthUser?.roles ?? [],
          permissions: currentAuthUser?.permissions,
        });
        setForm({
          name: next.name ?? "",
          email: next.email ?? "",
          phone: next.phone ?? "",
          birthDate: next.dateOfBirth ?? "",
          gender: next.gender ?? "prefer_not_to_say",
        });
      })
      .finally(() => setLoading(false));
  }, [setAuthUser]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const next = await accountService.updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
        date_of_birth: form.birthDate,
        gender: form.gender || "prefer_not_to_say",
      });
      setProfile(next);
      setAuthUser({
        id: next.id,
        name: next.name,
        email: next.email,
        avatar: next.avatar ?? authUser?.avatar ?? null,
        roles: authUser?.roles ?? [],
        permissions: authUser?.permissions,
      });
      toast.success("Profile updated successfully.");
    } catch {
      toast.error("Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Upload a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile picture must be 2MB or smaller.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const next = await accountService.uploadAvatar(file);
      setProfile(next);
      setAuthUser({
        id: next.id,
        name: next.name,
        email: next.email,
        avatar: next.avatar ?? null,
        roles: authUser?.roles ?? [],
        permissions: authUser?.permissions,
      });
      toast.success("Profile picture updated.");
    } catch {
      toast.error("Unable to upload profile picture.");
    } finally {
      setUploadingAvatar(false);
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

        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
          <AccountSidebar active="profile" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">Profile Settings</h1>
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center gap-5 mb-8 pb-8 border-b border-border">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                    {profile?.avatar ? (
                      <Image
                        src={profile.avatar}
                        alt={profile.name}
                        width={80}
                        height={80}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-extrabold text-primary">{getInitials(profile?.name ?? "User")}</span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-7 h-7 cursor-pointer bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:opacity-90 shadow-md">
                    <Camera size={12} />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={uploadingAvatar}
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div>
                  <p className="font-bold">{profile?.name}</p>
                  <p className="text-sm text-muted-foreground">Member since {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString() : "Not available"}</p>
                  <p className="text-xs text-primary mt-1">{profile?.membershipLevel ?? "Member"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Profile completion {profile?.profileCompletion ?? 0}%
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { label: "Full Name", key: "name", type: "text", placeholder: "Enter name" },
                    { label: "Email Address", key: "email", type: "email", placeholder: "Enter email" },
                    { label: "Phone Number", key: "phone", type: "tel", placeholder: "Enter phone number" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold mb-2">{label}</label>
                      <input
                        type={type}
                        value={form[key as keyof typeof form]}
                        onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                        placeholder={placeholder}
                        className={profileFieldClass}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Gender</label>
                    <Select
                      value={form.gender || "prefer_not_to_say"}
                      onValueChange={(value) => setForm((current) => ({ ...current, gender: value }))}
                    >
                      <SelectTrigger className="h-[46px] rounded-xl border-border bg-background px-4 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-100">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DatePicker label="Date of Birth" value={form.birthDate} onChange={(value) => setForm((current) => ({ ...current, birthDate: value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
                    <Save size={15} /> Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
