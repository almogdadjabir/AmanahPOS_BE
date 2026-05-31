/**
 * Currency formatters for AmanaPOS.
 *
 * Rules (per PREMIUM_DESIGN_SYSTEM.md §5):
 * - Never show .00 on SDG — no decimals
 * - Currency unit smaller + muted: render it as a separate <span> in JSX
 * - Always tabular-nums (apply .num class in Tailwind or tabular-nums inline)
 * - Locale-aware: Arabic digits in ar locale
 */

/**
 * Format a SDG amount as a string with thousands separators, no decimals.
 *
 * @param value   number — the raw amount
 * @param locale  "en" | "ar" — controls digit script
 * @returns       "450,000" (en) or "٤٥٠٬٠٠٠" (ar)
 */
export function formatSDG(
  value: number | string,
  locale: 'en' | 'ar' = 'en',
): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n)) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SD' : 'en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
}

/**
 * Compact formatter: K / M for large numbers in KPI labels.
 * 450000 → "450K" | 1200000 → "1.2M"
 */
export function fmtCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

/**
 * Parse a Django DecimalField string to a JS number safely.
 * Returns 0 if the value is null, undefined, or non-numeric.
 */
export function parseAmount(value: string | null | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(value);
  return isFinite(n) ? n : 0;
}
