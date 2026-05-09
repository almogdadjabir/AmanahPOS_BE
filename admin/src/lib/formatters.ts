export function formatCurrency(value: number | string, currency = 'SDG'): string {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(amount) || isNaN(amount)) return `0 ${currency}`;

  if (amount >= 1_000_000) {
    return (
      new Intl.NumberFormat('en', {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1,
      }).format(amount) +
      ' ' +
      currency
    );
  }

  return (
    new Intl.NumberFormat('en', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount) +
    ' ' +
    currency
  );
}
