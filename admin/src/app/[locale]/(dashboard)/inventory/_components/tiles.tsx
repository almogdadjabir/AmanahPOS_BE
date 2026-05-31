'use client';

/**
 * Bento tiles for the Premium Inventory Command Center.
 *
 * Each tile is a self-contained micro-experience. Tiles only know about
 * their own data and their own drill-down action; the shell wires them
 * to drawers / detail views.
 *
 * Pattern: every tile is a <BentoTile> + <TileTitle> + body.
 * Add a new tile by following the same shape — keep them visually calm,
 * one strong number or chart, never more than 4-5 rows.
 */

import { ReactNode } from 'react';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, Calendar, ChevronRight,
  Download, History, Layers, Package, Plus, RefreshCcw, ScanLine, Sparkles,
  Truck, Users, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Building blocks ─────────────────────────────────────────────── */

interface BentoTileProps {
  span?:     1 | 2 | 3 | 4;
  rowSpan?:  1 | 2 | 3;
  children:  ReactNode;
  className?: string;
}

export function BentoTile({ span = 1, rowSpan = 1, children, className }: BentoTileProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-card border border-border p-5 flex flex-col shadow-card',
        className,
      )}
      style={{ gridColumn: `span ${span}`, gridRow: `span ${rowSpan}` }}
    >
      <div className="relative z-[1] flex flex-1 flex-col">{children}</div>
    </div>
  );
}

interface TileTitleProps {
  icon:    ReactNode;
  title:   string;
  count?:  ReactNode;
  accent?: 'primary' | 'warning' | 'danger' | 'info' | 'premium';
  action?: ReactNode;
}

export function TileTitle({ icon, title, count, accent = 'primary', action }: TileTitleProps) {
  const ACCENTS = {
    primary: 'bg-primary-soft text-[#0A5C55] border-[#A7F3D0]',
    warning: 'bg-warning-light text-[#92400E] border-[#FED7AA]',
    danger:  'bg-danger-light  text-[#991B1B] border-[#FECACA]',
    info:    'bg-info-light    text-[#1E40AF] border-[#BFDBFE]',
    premium: 'text-white border-transparent',
  };
  const premiumStyle =
    accent === 'premium'
      ? { background: 'linear-gradient(155deg, #D97706 0%, #92400E 100%)' }
      : undefined;
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className={cn(
          'grid place-items-center w-7 h-7 rounded-lg border',
          ACCENTS[accent],
        )}
        style={premiumStyle}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="m-0 text-sm font-extrabold text-foreground">{title}</h3>
        {count != null && <div className="text-[11px] font-semibold text-muted-foreground">{count}</div>}
      </div>
      {action}
    </div>
  );
}

/* ─── 1. Stock Health Ring ────────────────────────────────────────── */

interface HealthRingProps {
  pct:    number;
  inStock:  number;
  low:      number;
  out:      number;
  onOpen?:  () => void;
}

export function HealthRing({ pct, inStock, low, out, onOpen }: HealthRingProps) {
  const radius = 64;
  const C = 2 * Math.PI * radius;
  const offset = C * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <BentoTile rowSpan={2}>
      <TileTitle icon={<Layers className="h-3.5 w-3.5" />} title="Stock health" accent="premium" />
      <div className="relative flex flex-1 flex-col items-center justify-center">
        <svg width={172} height={172} viewBox="0 0 172 172">
          <defs>
            <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%"   stopColor="#FBBF24" />
              <stop offset="50%"  stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
          </defs>
          <circle cx="86" cy="86" r={radius} fill="none" stroke="#EEF2F6" strokeWidth="14" />
          <circle
            cx="86" cy="86" r={radius} fill="none" stroke="url(#ringGrad)"
            strokeWidth="14" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset}
            transform="rotate(-90 86 86)"
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-[30px] font-extrabold tracking-tight tabular-nums text-foreground">
            {pct.toFixed(1)}%
          </div>
          <div className="mt-1 text-[11px] font-bold text-muted-foreground">HEALTHY</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {[
          { label: 'In',  v: inStock, c: '#059669' },
          { label: 'Low', v: low,     c: '#D97706' },
          { label: 'Out', v: out,     c: '#E53E3E' },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={onOpen}
            className="px-2.5 py-2 rounded-lg bg-muted/50 text-center hover:bg-muted transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.c }} />
              <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-[0.4px]">
                {s.label}
              </span>
            </span>
            <div className="text-base font-extrabold text-foreground tabular-nums">{s.v}</div>
          </button>
        ))}
      </div>
    </BentoTile>
  );
}

/* ─── 2. Inbound Velocity ─────────────────────────────────────────── */

interface InboundVelocityProps {
  series:   number[];     // last 14 days
  labels:   string[];     // M T W T F S S …
  avgPerDay: number;
  peak:      { value: number; label: string };
  spend:     string;
  deltaPct:  number;
  onOpen?:   () => void;
}

export function InboundVelocity({
  series, labels, avgPerDay, peak, spend, deltaPct, onOpen,
}: InboundVelocityProps) {
  const max = Math.max(...series, 1);
  return (
    <BentoTile span={2}>
      <TileTitle
        icon={<Truck className="h-3.5 w-3.5" />}
        title="Inbound velocity"
        count={`Last 14 days · ${series.reduce((a, b) => a + b, 0).toLocaleString()} units`}
        accent="premium"
        action={
          <button
            type="button"
            onClick={onOpen}
            className="text-xs font-bold text-foreground bg-card border border-border rounded-lg px-3 py-1.5 hover:bg-muted"
          >
            Open inbound
          </button>
        }
      />
      <div className="flex flex-1 items-end gap-1.5 pt-3.5">
        {series.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md"
              style={{
                height: v === 0 ? 4 : Math.max(8, (v / max) * 120),
                background: v === 0
                  ? 'var(--border-soft, #EEF2F6)'
                  : 'linear-gradient(180deg, #FBBF24 0%, #D97706 60%, #92400E 100%)',
              }}
            />
            <span className="text-[10px] font-bold text-muted-foreground">{labels[i]}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3.5 mt-4 pt-4 border-t border-border">
        <Stat label="Avg/day" value={avgPerDay.toString()} />
        <Divider />
        <Stat label="Peak" value={`${peak.value}`} hint={`(${peak.label})`} />
        <Divider />
        <Stat label="Spend" value={spend} tone="success" />
        <div className="flex-1" />
        <DeltaPill pct={deltaPct} />
      </div>
    </BentoTile>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'success' }) {
  return (
    <div>
      <div className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-[0.4px]">{label}</div>
      <div className={cn('text-base font-extrabold tabular-nums', tone === 'success' ? 'text-success' : 'text-foreground')}>
        {value}
        {hint && <span className="ml-1 text-[11px] font-bold text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border" />;
}

function DeltaPill({ pct }: { pct: number }) {
  const positive = pct >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border',
        positive
          ? 'bg-success-light text-success border-[#BBF7D0]'
          : 'bg-danger-light text-destructive border-[#FECACA]',
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: positive ? '#059669' : '#E53E3E' }} />
      {positive ? '+' : ''}{pct}% vs prior 14d
    </span>
  );
}

/* ─── 3. Restock Queue ────────────────────────────────────────────── */

export interface RestockItem {
  id:        string;
  name:      string;
  qty:       number;
  min:       number;
  vendor:    string;
}

export function RestockQueue({
  items, onReceive, onOpenAll,
}: {
  items:      RestockItem[];
  onReceive?: (it: RestockItem) => void;
  onOpenAll?: () => void;
}) {
  return (
    <BentoTile rowSpan={2}>
      <TileTitle
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        title="Restock queue"
        count={`${items.length} items need action`}
        accent="warning"
        action={
          <button type="button" onClick={onOpenAll} className="text-xs font-bold text-muted-foreground hover:text-foreground">
            All →
          </button>
        }
      />
      <div className="flex flex-1 flex-col gap-2">
        {items.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border"
            style={{
              background: r.qty === 0
                ? 'linear-gradient(180deg, #FFF5F5, white)'
                : 'linear-gradient(180deg, #FFFBEB, white)',
            }}
          >
            <div
              className="min-w-[38px] h-[38px] rounded-lg grid place-items-center text-white font-extrabold text-[15px] tabular-nums"
              style={{ background: r.qty === 0 ? '#E53E3E' : '#D97706' }}
            >
              {r.qty}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold truncate">{r.name}</div>
              <div className="text-[11px] text-muted-foreground">min {r.min} · {r.vendor}</div>
            </div>
            <button
              type="button"
              onClick={() => onReceive?.(r)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold text-white bg-premium-cta"
            >
              Receive
            </button>
          </div>
        ))}
      </div>
    </BentoTile>
  );
}

/* ─── 4. Expiry Timeline ──────────────────────────────────────────── */

export interface ExpiryBatchLite {
  id:    string;
  name:  string;
  days:  number;   // negative = expired
  qty:   number;
}

export function ExpiryTimeline({
  batches, suggestion, onOpen, onAutoPromo,
}: {
  batches:      ExpiryBatchLite[];
  suggestion?:  ReactNode;
  onOpen?:      () => void;
  onAutoPromo?: () => void;
}) {
  return (
    <BentoTile span={2}>
      <TileTitle
        icon={<Calendar className="h-3.5 w-3.5" />}
        title="Expiry timeline"
        count={`${batches.length} batches in next 30 days`}
        accent="warning"
        action={
          <button
            type="button"
            onClick={onOpen}
            className="text-xs font-bold text-foreground bg-card border border-border rounded-lg px-3 py-1.5 hover:bg-muted"
          >
            Open expiry
          </button>
        }
      />
      {/* Timeline */}
      <div className="relative h-[70px] mx-2 my-1">
        <div
          className="absolute left-0 right-0 top-8 h-0.5 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #E53E3E 0%, #D97706 24%, #059669 100%)',
          }}
        />
        {/* Today */}
        <div className="absolute left-0 top-5 bottom-5">
          <div className="absolute top-0.5 -left-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-foreground" />
          <div className="absolute top-[22px] text-[10px] font-extrabold text-foreground">Today</div>
        </div>
        {[7, 14, 21, 30].map((d) => (
          <div key={d} className="absolute top-7" style={{ left: `${(d / 30) * 100}%` }}>
            <div className="w-px h-2 bg-[#CBD5E1]" />
            <div className="text-[10px] font-bold text-muted-foreground -translate-x-1/2">+{d}d</div>
          </div>
        ))}
        {batches.map((b) => {
          const pct = b.days < 0 ? 0 : Math.min(100, (b.days / 30) * 100);
          const danger = b.days < 0 || b.days <= 5;
          return (
            <div
              key={b.id}
              className="absolute top-[18px] -translate-x-1/2"
              style={{ left: `${pct}%` }}
            >
              <div
                className="relative w-3.5 h-3.5 rounded-full border-2 border-white"
                style={{
                  background: danger ? '#E53E3E' : '#D97706',
                  boxShadow: '0 0 0 1px var(--border, #E8EDF3)',
                }}
              >
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9.5px] font-extrabold whitespace-nowrap"
                  style={{ color: danger ? '#E53E3E' : '#92400E' }}
                >
                  {b.qty}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {suggestion && (
        <div className="mt-1.5 px-3.5 py-3 rounded-xl bg-muted/50 flex items-center gap-3.5">
          <Zap className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.2} />
          <div className="flex-1 text-[12.5px] font-semibold text-foreground">{suggestion}</div>
          {onAutoPromo && (
            <button
              type="button"
              onClick={onAutoPromo}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-premium-cta"
            >
              Auto-promo
            </button>
          )}
        </div>
      )}
    </BentoTile>
  );
}

/* ─── 5. Top Vendors ──────────────────────────────────────────────── */

export interface VendorLite {
  id:     string;
  name:   string;
  share:  number;     // percent
  value:  string;     // formatted spend
  onTime: number;     // percent
}

export function VendorBoard({
  vendors, onOpenAll,
}: {
  vendors: VendorLite[];
  onOpenAll?: () => void;
}) {
  return (
    <BentoTile rowSpan={2}>
      <TileTitle
        icon={<Users className="h-3.5 w-3.5" />}
        title="Top vendors"
        count={`${vendors.length} active · 90-day window`}
        accent="info"
        action={
          <button type="button" onClick={onOpenAll} className="text-xs font-bold text-muted-foreground hover:text-foreground">
            All →
          </button>
        }
      />
      <div className="flex flex-col gap-3.5">
        {vendors.map((v, i) => (
          <div key={v.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="grid place-items-center w-7 h-7 rounded-full text-[10px] font-extrabold border"
                style={{
                  background: 'linear-gradient(135deg, var(--primary-soft, #F0FDFA), white)',
                  borderColor: '#BBF7D0',
                  color: '#064E47',
                }}
              >
                {v.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-bold truncate">{v.name}</div>
                <div className="text-[11px] text-muted-foreground">{v.onTime}% on-time</div>
              </div>
              <span className="text-[13px] font-extrabold text-success tabular-nums">{v.value}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, v.share * 2.6)}%`,
                  background:
                    i === 0 ? 'linear-gradient(90deg, #FBBF24 0%, #D97706 100%)' :
                    i === 1 ? '#3B82F6' :
                    i === 2 ? '#D97706' : '#6B7280',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </BentoTile>
  );
}

/* ─── 6. Recent Receipts ──────────────────────────────────────────── */

export interface ReceiptLite {
  id:     string;
  vendor: string;
  units:  number;
  value:  string;
  shop:   string;
  time:   string;
}

export function RecentReceipts({
  receipts, onOpen,
}: {
  receipts: ReceiptLite[];
  onOpen?:  () => void;
}) {
  return (
    <BentoTile span={2}>
      <TileTitle
        icon={<History className="h-3.5 w-3.5" />}
        title="Recent receipts"
        count={`${receipts.length} shown · last 7 days`}
        accent="premium"
        action={
          <button
            type="button"
            onClick={onOpen}
            className="text-xs font-bold text-foreground bg-card border border-border rounded-lg px-3 py-1.5 hover:bg-muted"
          >
            Open inbound
          </button>
        }
      />
      <div className="flex flex-col gap-2">
        {receipts.map((r) => (
          <div key={r.id} className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl bg-muted/50">
            <div
              className="grid place-items-center w-9 h-9 rounded-lg text-white"
              style={{
                background: 'linear-gradient(155deg, #FBBF24 0%, #D97706 50%, #92400E 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(244,219,169,0.25)',
              }}
            >
              <Truck className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-extrabold">{r.vendor}</span>
                <span className="text-[11px] font-mono font-bold text-[#064E47]">{r.id}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-success-light text-success border border-[#BBF7D0]">
                  Received
                </span>
              </div>
              <div className="text-[11.5px] text-muted-foreground">{r.units} units · {r.shop} · {r.time}</div>
            </div>
            <div className="text-right">
              <div className="text-base font-extrabold text-success tabular-nums">{r.value}</div>
              <div className="text-[10.5px] text-muted-foreground">tap to view</div>
            </div>
          </div>
        ))}
      </div>
    </BentoTile>
  );
}

/* ─── 7. Quick Actions ────────────────────────────────────────────── */

export interface QuickAction {
  label:    string;
  hint:     string;
  icon:     ReactNode;
  primary?: boolean;
  onClick?: () => void;
}

export function QuickCommand({ actions }: { actions: QuickAction[] }) {
  return (
    <BentoTile className="bg-gradient-to-br from-[rgba(71,81,176,0.04)] to-[rgba(232,215,166,0.05)]">
      <TileTitle icon={<Zap className="h-3.5 w-3.5" />} title="Quick actions" accent="premium" />
      <div className="flex flex-col gap-2">
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={a.onClick}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors',
              a.primary ? 'text-white bg-premium-cta border border-[rgba(232,215,166,0.18)]'
                       : 'bg-card border border-border text-foreground hover:bg-muted',
            )}
          >
            <span className="flex-shrink-0">{a.icon}</span>
            <div className="flex-1">
              <div className="text-[12.5px] font-extrabold">{a.label}</div>
              <div className="text-[11px] opacity-75 font-medium">{a.hint}</div>
            </div>
            <ChevronRight className="h-3 w-3 opacity-70" />
          </button>
        ))}
      </div>
    </BentoTile>
  );
}

/* Re-export the lucide icons that tile callers will want */
export {
  Plus, Truck, Download, ScanLine, Layers, AlertTriangle, Calendar, Users,
  History, Zap, RefreshCcw, Sparkles, Package, ArrowUpRight, ArrowRight,
};
