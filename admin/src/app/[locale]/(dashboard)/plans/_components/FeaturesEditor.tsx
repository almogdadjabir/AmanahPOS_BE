'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, Plus, X } from 'lucide-react';

// ── Predefined feature catalogue ──────────────────────────────────────────────

const FEATURE_CATALOGUE = [
  { key: 'pos',              label: 'Point of Sale',        hint: 'Core POS transactions & checkout' },
  { key: 'reports',          label: 'Reports & Analytics',  hint: 'Sales, revenue, and trend reports' },
  { key: 'inventory',        label: 'Inventory Management', hint: 'Stock levels, alerts, and movements' },
  { key: 'multi_shop',       label: 'Multiple Shops',       hint: 'Manage more than one shop location' },
  { key: 'customers',        label: 'Customer Management',  hint: 'Profiles, history, and loyalty' },
  { key: 'loyalty',          label: 'Loyalty Points',       hint: 'Points earning and redemption' },
  { key: 'staff_management', label: 'Staff Management',     hint: 'Staff roles, shifts, and permissions' },
  { key: 'data_export',      label: 'Data Export',          hint: 'Export reports to CSV / PDF' },
  { key: 'api_access',       label: 'API Access',           hint: 'Third-party integration endpoints' },
  { key: 'custom_receipts',  label: 'Custom Receipts',      hint: 'Branded and custom receipt templates' },
  { key: 'discounts',        label: 'Discounts & Coupons',  hint: 'Item discounts and promo codes' },
  { key: 'refunds',          label: 'Refunds',              hint: 'Process full and partial refunds' },
] as const;

type FeatureKey = typeof FEATURE_CATALOGUE[number]['key'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFeatures(raw: string | Record<string, unknown>): Record<string, boolean> {
  if (typeof raw === 'object' && raw !== null) {
    return Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Boolean(v)]),
    );
  }
  try {
    const parsed = JSON.parse(raw as string);
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, Boolean(v)]),
      );
    }
  } catch {
    // ignore
  }
  return {};
}

function toJson(features: Record<string, boolean>): string {
  const enabled = Object.fromEntries(Object.entries(features).filter(([, v]) => v));
  return JSON.stringify(enabled);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  name:          string;
  defaultValue?: Record<string, unknown> | string;
}

export default function FeaturesEditor({ name, defaultValue }: Props) {
  const [tab,      setTab]      = useState<'visual' | 'json'>('visual');
  const [features, setFeatures] = useState<Record<string, boolean>>(() =>
    parseFeatures(defaultValue ?? {}),
  );
  const [jsonText, setJsonText]  = useState(() => toJson(parseFeatures(defaultValue ?? {})));
  const [jsonError, setJsonError] = useState(false);

  // Sync json textarea whenever features change (from visual tab)
  function updateFromVisual(next: Record<string, boolean>) {
    setFeatures(next);
    setJsonText(toJson(next));
    setJsonError(false);
  }

  // Parse json textarea input → update visual state
  function handleJsonChange(raw: string) {
    setJsonText(raw);
    try {
      const parsed = JSON.parse(raw || '{}');
      if (typeof parsed === 'object' && parsed !== null) {
        setFeatures(parseFeatures(parsed));
        setJsonError(false);
      } else {
        setJsonError(true);
      }
    } catch {
      setJsonError(true);
    }
  }

  // Separate catalogue entries from custom keys
  const catalogueKeys = FEATURE_CATALOGUE.map(f => f.key) as string[];
  const customKeys = Object.keys(features).filter(
    k => !catalogueKeys.includes(k) && features[k],
  );

  function toggle(key: string) {
    updateFromVisual({ ...features, [key]: !features[key] });
  }

  function removeCustom(key: string) {
    const next = { ...features };
    delete next[key];
    updateFromVisual(next);
  }

  // The value submitted with the form
  const hiddenValue = jsonError ? jsonText : toJson(features);

  const activeCount = Object.values(features).filter(Boolean).length;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 mb-3 w-fit">
        {(['visual', 'json'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 capitalize',
              t === tab
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'visual' ? 'Toggle Features' : 'JSON'}
            {t === 'visual' && activeCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-success/20 text-success text-[9px] font-black">
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'visual' ? (
        <div className="space-y-2">
          {/* Catalogue features */}
          <div className="grid grid-cols-2 gap-1.5">
            {FEATURE_CATALOGUE.map(feature => {
              const active = Boolean(features[feature.key]);
              return (
                <button
                  key={feature.key}
                  type="button"
                  onClick={() => toggle(feature.key)}
                  className={cn(
                    'group flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-all duration-150',
                    active
                      ? 'border-success/30 bg-success/5 hover:bg-success/8'
                      : 'border-border bg-card hover:bg-muted/40 hover:border-border/80',
                  )}
                >
                  <span className={cn(
                    'mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                    active
                      ? 'bg-success border-success'
                      : 'border-border group-hover:border-muted-foreground',
                  )}>
                    {active && <Check size={9} className="text-white" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0">
                    <p className={cn(
                      'text-[12px] font-semibold leading-tight',
                      active ? 'text-success' : 'text-foreground',
                    )}>
                      {feature.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{feature.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom keys (not in catalogue) */}
          {customKeys.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.07em]">Custom keys</p>
              <div className="flex flex-wrap gap-1.5">
                {customKeys.map(key => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/5 px-2 py-1 text-[11px] font-mono text-warning"
                  >
                    {key}
                    <button type="button" onClick={() => removeCustom(key)}>
                      <X size={9} className="hover:text-destructive" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeCount === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-1">
              No features selected — all will be unavailable for this plan.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <textarea
            value={jsonText}
            onChange={e => handleJsonChange(e.target.value)}
            rows={4}
            placeholder='{"pos": true, "reports": true}'
            className={cn(
              'w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors resize-none',
              jsonError
                ? 'border-destructive focus:ring-destructive/30 focus:border-destructive'
                : 'border-border focus:ring-success/30 focus:border-success',
            )}
          />
          {jsonError && (
            <p className="text-[11px] text-destructive">Invalid JSON — fix before saving.</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Keys from the catalogue are synced automatically with the toggle view.
          </p>
        </div>
      )}

      <input type="hidden" name={name} value={hiddenValue} />
    </div>
  );
}
