"use client";

import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from '@/components/settings/BrandLogo';
import { selectBranding, selectCompanyName, selectFrontendNavigation, selectSettingsPending, selectSocialLinks, useSettingsStore } from '@/store/settings-store';

function SocialIcon({
  href,
  label,
  openInNewTab,
}: {
  href: string;
  label: string;
  openInNewTab: boolean;
}) {
  return (
    <a
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
    >
      <span className="text-xs font-bold uppercase">{label.slice(0, 1)}</span>
    </a>
  );
}

export function Footer() {
  const branding = useSettingsStore(selectBranding);
  const siteName = useSettingsStore(selectCompanyName);
  const navigation = useSettingsStore(selectFrontendNavigation);
  const socialLinks = useSettingsStore(selectSocialLinks);
  const isLoading = useSettingsStore(selectSettingsPending);
  const contactRows = [
    { icon: MapPin, value: branding?.address },
    { icon: Phone, value: branding?.support_phone || branding?.company_phone },
    { icon: Mail, value: branding?.support_email },
  ].filter((row) => row.value);
  const footerLinks = navigation.length
    ? navigation
    : [
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: 'Contact', href: '/contact' },
      ];
  const legalLinks = [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ];

  if (isLoading) {
    return (
      <footer className="border-t border-border bg-background">
        <div className="bg-primary py-12">
          <div className="mx-auto max-w-7xl space-y-4 px-4 text-center">
            <span className="mx-auto block h-8 w-8 animate-pulse rounded-lg bg-primary-foreground/20" />
            <span className="mx-auto block h-7 w-56 animate-pulse rounded bg-primary-foreground/20" />
            <span className="mx-auto block h-4 w-80 max-w-full animate-pulse rounded bg-primary-foreground/20" />
            <span className="mx-auto block h-11 w-full max-w-md animate-pulse rounded-xl bg-primary-foreground/20" />
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-4 lg:col-span-2">
            <span className="block h-8 w-40 animate-pulse rounded bg-muted" />
            <span className="block h-4 w-64 animate-pulse rounded bg-muted" />
            <span className="block h-4 w-48 animate-pulse rounded bg-muted" />
            <span className="block h-4 w-56 animate-pulse rounded bg-muted" />
          </div>
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <span className="block h-5 w-24 animate-pulse rounded bg-muted" />
              <span className="block h-4 w-20 animate-pulse rounded bg-muted" />
              <span className="block h-4 w-24 animate-pulse rounded bg-muted" />
              <span className="block h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-background border-t border-border">
      {/* Newsletter */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Mail size={32} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl font-bold mb-2">Stay in the Loop</h2>
          <p className="opacity-80 mb-6 max-w-md mx-auto">
            Get updates from {siteName || 'our store'} delivered straight to your inbox.
          </p>
          <div className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your email address"
              className="min-w-0 flex-1 rounded-xl border border-white/30 bg-white/20 px-4 py-2.5 text-sm text-white transition-colors placeholder:text-white/60 focus:border-white/60"
            />
            <button className="whitespace-nowrap rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-white/90">
              Subscribe
            </button>
          </div>
          <p className="text-xs opacity-60 mt-3">No spam ever. Unsubscribe anytime.</p>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <BrandLogo href="/" className="mb-4 max-w-xs" textClassName="text-xl" />
            {branding?.legal_company_name ? (
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
                {branding.legal_company_name}
              </p>
            ) : null}
            {contactRows.length ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {contactRows.map(({ icon: Icon, value }) => (
                  <div key={String(value)} className="flex items-center gap-2">
                    <Icon size={14} className="shrink-0" />
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {/* Social Links */}
            {socialLinks.length ? (
              <div className="flex items-center gap-2 mt-6">
                {socialLinks.map((link, index) => (
                  <SocialIcon
                    key={`${link.platform}-${link.url}-${index}`}
                    href={link.url}
                    label={link.platform}
                    openInNewTab={link.open_in_new_tab}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Links */}
          {[
            { title: 'Navigation', links: footerLinks },
            { title: 'Legal', links: legalLinks },
          ].map(({ title, links }) => (
            <div key={title}>
              <h3 className="font-semibold text-sm mb-4">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link, index) => (
                  <li key={`${link.href}-${index}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-center text-xs text-muted-foreground md:flex-row md:text-left">
          <p>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {legalLinks.map((link, index) => (
              <Link key={`${link.href}-${index}`} href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
