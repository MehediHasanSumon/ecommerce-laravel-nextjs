"use client";

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from '@/components/settings/BrandLogo';
import { subscribeToNewsletter } from '@/services/catalog-service';
import {
  selectBranding,
  selectCompanyName,
  selectFrontendNavigation,
  selectPaymentMethods,
  selectSettingsPending,
  selectSocialLinks,
  useSettingsStore,
} from '@/store/settings-store';
import type { RuntimePaymentMethod } from '@/types/settings';

const hiddenFooterPaymentGateways = new Set(['cash_on_delivery', 'home_delivery']);

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

function PaymentMethodBadge({ method }: { method: RuntimePaymentMethod }) {
  const label = method.name || method.gateway.replace(/_/g, ' ');

  return (
    <span className="inline-flex h-9 max-w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-xs font-semibold text-foreground">
      {method.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={method.logoUrl} alt="" className="h-4 max-w-16 object-contain" loading="lazy" />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const branding = useSettingsStore(selectBranding);
  const siteName = useSettingsStore(selectCompanyName);
  const navigation = useSettingsStore(selectFrontendNavigation);
  const paymentMethods = useSettingsStore(selectPaymentMethods);
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
  const acceptedPaymentMethods = useMemo(
    () => paymentMethods.filter((method) => !hiddenFooterPaymentGateways.has(method.gateway.toLowerCase())),
    [paymentMethods],
  );

  async function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();

    if (!value) {
      setMessageType('error');
      setMessage('Enter email.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const responseMessage = await subscribeToNewsletter(value);
      setEmail('');
      setMessageType('success');
      setMessage(responseMessage);
    } catch (error: unknown) {
      const maybeAxios = error as { response?: { data?: { message?: string; errors?: { email?: string[] } } } };
      setMessageType('error');
      setMessage(maybeAxios.response?.data?.errors?.email?.[0] ?? maybeAxios.response?.data?.message ?? 'Subscription failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <footer className="border-t border-border bg-background">
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
          <div className="space-y-3 lg:col-span-2">
            <span className="block h-5 w-32 animate-pulse rounded bg-muted" />
            <span className="block h-4 w-64 animate-pulse rounded bg-muted" />
            <span className="block h-10 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-background border-t border-border">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12 lg:px-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <BrandLogo href="/" className="mb-4 max-w-xs" textClassName="text-xl" />
            {branding?.legal_company_name ? (
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-xs">
                {branding.legal_company_name}
              </p>
            ) : null}
            {contactRows.length ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {contactRows.map(({ icon: Icon, value }) => (
                  <div key={String(value)} className="flex min-w-0 items-start gap-2">
                    <Icon size={14} className="shrink-0" />
                    <span className="min-w-0 break-words">{value}</span>
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

          {/* Newsletter */}
          <div className="col-span-2 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Mail size={18} className="text-muted-foreground" />
              <h3 className="font-semibold text-sm">Stay in the Loop</h3>
            </div>
            <p className="mb-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Get updates from {siteName || 'our store'} delivered straight to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex max-w-sm flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter email"
                disabled={submitting}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-70"
              />
              <button disabled={submitting} className="whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70">
                {submitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            {message ? (
              <p className={`mt-3 text-xs ${messageType === 'success' ? 'text-muted-foreground' : 'text-destructive'}`}>{message}</p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">No spam ever. Unsubscribe anytime.</p>
            )}
            {acceptedPaymentMethods.length ? (
              <div className="mt-6 max-w-sm">
                <h3 className="mb-3 text-sm font-semibold">We accept</h3>
                <div className="flex flex-wrap gap-2">
                  {acceptedPaymentMethods.map((method) => (
                    <PaymentMethodBadge key={method.gateway} method={method} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
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
