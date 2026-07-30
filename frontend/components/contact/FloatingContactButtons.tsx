"use client";

import { usePathname } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { selectFloatingContact, useSettingsStore } from "@/store/settings-store";

export function FloatingContactButtons() {
  const pathname = usePathname();
  const settings = useSettingsStore(selectFloatingContact);

  if (pathname.startsWith("/admin") || !settings.enabled) {
    return null;
  }

  const buttons = [
    settings.messenger_url ? {
      href: settings.messenger_url,
      label: "Open Facebook Messenger",
      icon: Send,
      className: "bg-[#0084ff] text-white hover:bg-[#0075e5]",
    } : null,
    settings.whatsapp_url ? {
      href: settings.whatsapp_url,
      label: "Open WhatsApp",
      icon: MessageCircle,
      className: "bg-[#25d366] text-white hover:bg-[#20bd5a]",
    } : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: typeof MessageCircle;
    className: string;
  }>;

  if (!buttons.length) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-4 z-50 flex flex-col gap-3 sm:bottom-6 sm:right-6">
      {buttons.map(({ href, label, icon: Icon, className }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-14 sm:w-14 ${className}`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}
