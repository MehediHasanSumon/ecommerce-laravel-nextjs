import { defaultCurrencySettings, selectCurrencySettings, useSettingsStore } from '@/store/settings-store';
import type { RuntimeCurrencySettings } from '@/types/settings';

export function formatCurrency(amount: number | string | null | undefined, settings: RuntimeCurrencySettings = currencySettings()): string {
  const numeric = Number(amount ?? 0);
  const safeAmount = Number.isFinite(numeric) ? numeric : 0;
  const decimalPlaces = Math.max(0, Math.min(4, Number(settings.decimal_places ?? defaultCurrencySettings.decimal_places)));
  const [integerPart, decimalPart] = Math.abs(safeAmount).toFixed(decimalPlaces).split('.');
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousands_separator || ',');
  const sign = safeAmount < 0 ? '-' : '';
  const formattedNumber = decimalPlaces > 0
    ? `${sign}${groupedInteger}${settings.decimal_separator || '.'}${decimalPart}`
    : `${sign}${groupedInteger}`;
  const symbol = settings.currency_symbol || settings.currency || defaultCurrencySettings.currency_symbol;

  return settings.currency_position === 'right'
    ? `${formattedNumber} ${symbol}`
    : `${symbol}${formattedNumber}`;
}

export function formatPrice(amount: number | string | null | undefined): string {
  return formatCurrency(amount);
}

export function formatDiscount(discount: number): string {
  return `${discount}% OFF`;
}

export function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export function formatProductCount(count: number): string {
  return `${count} products`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function formatOrderNumber(orderNumber: string): string {
  return orderNumber.toUpperCase();
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function calculateSavings(original: number, discounted: number): number {
  return original - discounted;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function currencySettings(): RuntimeCurrencySettings {
  return selectCurrencySettings(useSettingsStore.getState());
}
