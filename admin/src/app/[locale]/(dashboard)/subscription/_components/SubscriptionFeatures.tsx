import { Check, X } from 'lucide-react';

const FEATURE_LABELS: Record<string, string> = {
  reports:             'Sales Reports',
  multi_shop:          'Multi-Shop',
  api_access:          'API Access',
  custom_branding:     'Custom Branding',
  inventory:           'Inventory Tracking',
  loyalty_points:      'Loyalty Points',
  customer_management: 'Customers',
  export:              'Data Export',
  sms_notifications:   'SMS Notifications',
  priority_support:    'Priority Support',
};

function fmt(key: string): string {
  return FEATURE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function parse(value: unknown): { enabled: boolean } | null {
  if (typeof value === 'boolean') return { enabled: value };
  if (typeof value === 'number')  return { enabled: value > 0 };
  if (typeof value === 'string' && value.trim()) return { enabled: true };
  return null;
}

export default function SubscriptionFeatures({ features }: { features: Record<string, unknown> }) {
  const entries = Object.entries(features)
    .map(([key, value]) => {
      const p = parse(value);
      return p ? { key, label: fmt(key), enabled: p.enabled } : null;
    })
    .filter(Boolean) as Array<{ key: string; label: string; enabled: boolean }>;

  if (entries.length === 0) return null;

  const on  = entries.filter(e => e.enabled);
  const off = entries.filter(e => !e.enabled);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-5 h-full">
      <p className="text-[10.5px] font-black uppercase tracking-[0.14em] text-muted-foreground/60 mb-4">
        Plan Features
      </p>

      <div className="space-y-1">
        {on.map(e => (
          <div key={e.key} className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <span className="w-[18px] h-[18px] rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Check size={10} className="text-primary" strokeWidth={2.5} />
            </span>
            <span className="text-[12.5px] font-medium text-foreground">{e.label}</span>
          </div>
        ))}

        {off.length > 0 && on.length > 0 && (
          <div className="h-px bg-border/50 my-2" />
        )}

        {off.map(e => (
          <div key={e.key} className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg opacity-50">
            <span className="w-[18px] h-[18px] rounded-full bg-muted flex items-center justify-center shrink-0">
              <X size={10} className="text-muted-foreground/60" strokeWidth={2.5} />
            </span>
            <span className="text-[12.5px] font-medium text-muted-foreground line-through">{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
