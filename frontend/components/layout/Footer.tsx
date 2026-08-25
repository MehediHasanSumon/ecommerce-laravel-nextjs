"use client";

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { BrandLogo } from '@/components/settings/BrandLogo';
import { subscribeToNewsletter } from '@/services/catalog-service';
import {
  selectBranding,
  selectCompanyName,
  selectFooterSettings,
  selectFrontendNavigation,
  selectPaymentBanner,
  selectPaymentMethods,
  selectSettingsPending,
  selectSocialLinks,
  useSettingsStore,
} from '@/store/settings-store';
import type { RuntimePaymentMethod } from '@/types/settings';

const hiddenFooterPaymentGateways = new Set(['cash_on_delivery', 'home_delivery']);

function renderBrandIcon(icon: string) {
  const normalized = icon.toLowerCase().trim();

  switch (normalized) {
    case 'facebook':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'x':
    case 'twitter':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.73 1.25-.03 2.37-.78 2.89-1.91.31-.62.44-1.32.44-2.02V.02z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );
    case 'pinterest':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.357-.053.211-.174.268-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      );
    case 'telegram':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case 'threads':
      return (
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.186 24h-.007C5.457 23.99 0 18.572 0 11.97 0 5.372 5.457-.01 12.186-.01c6.702 0 12.124 5.352 12.124 11.98 0 3.25-.972 6.074-2.81 8.169-1.748 1.993-4.148 3.109-6.942 3.228-3.02.13-5.59-.854-7.234-2.772-1.572-1.834-2.316-4.428-2.152-7.501.326-6.104 4.708-10.748 10.37-10.975 3.013-.12 5.81.874 7.683 2.727.46.455.465 1.2.01 1.66-.455.46-1.2.465-1.66.01-1.464-1.448-3.663-2.229-6.04-2.134-4.542.182-8.083 3.963-8.347 8.905-.133 2.5.474 4.598 1.756 6.094 1.319 1.539 3.393 2.327 5.84 2.222 2.243-.096 4.156-.99 5.53-2.557 1.455-1.66 2.225-3.953 2.225-6.634 0-5.364-4.33-9.728-9.654-9.728-5.323 0-9.653 4.364-9.653 9.728 0 5.363 4.33 9.727 9.653 9.727h.007c.648 0 1.174.526 1.174 1.174 0 .649-.526 1.174-1.174 1.174z" />
        </svg>
      );
    default:
      return <span className="text-xs font-bold uppercase">{normalized.slice(0, 1)}</span>;
  }
}

function SocialIcon({
  href,
  label,
  icon,
  openInNewTab,
}: {
  href: string;
  label: string;
  icon?: string;
  openInNewTab: boolean;
}) {
  return (
    <a
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? "noopener noreferrer" : undefined}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:scale-105"
    >
      {renderBrandIcon(icon || label)}
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
  const paymentBanner = useSettingsStore(selectPaymentBanner);
  const isLoading = useSettingsStore(selectSettingsPending);
  const contactRows = [
    { icon: MapPin, value: branding?.address },
    { icon: Phone, value: branding?.support_phone || branding?.company_phone },
    { icon: Mail, value: branding?.support_email },
  ].filter((row) => row.value);
  const configuredFooterLinks = navigation.length
    ? navigation
    : [
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: 'Contact', href: '/contact' },
      ];
  const footerLinks = configuredFooterLinks.filter((link) => link.href !== '/order-tracking');
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
              <div className="flex flex-wrap items-center gap-2 mt-6">
                {socialLinks.map((link, index) => (
                  <SocialIcon
                    key={`${link.platform}-${link.url}-${index}`}
                    href={link.url}
                    label={link.platform}
                    icon={link.icon}
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

          {/* Newsletter & Payment Banner */}
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
                aria-label="Email address"
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

            {/* Payment Banner / Accepted Payment Methods */}
            {paymentBanner.enabled && (paymentBanner.image || acceptedPaymentMethods.length > 0) ? (
              <div className="mt-6 max-w-sm">
                <h3 className="mb-3 text-sm font-semibold">{paymentBanner.title || 'We accept'}</h3>
                {paymentBanner.image ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-card/60 p-2.5 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentBanner.image}
                      alt={paymentBanner.title || 'Payment methods banner'}
                      className="h-auto max-h-14 w-auto max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : acceptedPaymentMethods.length ? (
                  <div className="flex flex-wrap gap-2">
                    {acceptedPaymentMethods.map((method) => (
                      <PaymentMethodBadge key={method.gateway} method={method} />
                    ))}
                  </div>
                ) : null}
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
