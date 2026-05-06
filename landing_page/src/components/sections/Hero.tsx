'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Stat = { value: string; label: string };

const EASE = [0.4, 0, 0.2, 1] as [number, number, number, number];

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.52, ease: EASE } },
};

/* ── Screen data for carousel ─────────────────────────────────────────── */

const SCREENS = [
  { id: 'report',    label: 'Dashboard',  Icon: TrendingUp  },
  { id: 'pos',       label: 'Checkout',   Icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory',  Icon: Package      },
] as const;

/* ── Component ────────────────────────────────────────────────────────── */

export default function Hero() {
  const t       = useTranslations('hero');
  const tRoot   = useTranslations();
  const stats   = tRoot.raw('heroStats') as Stat[];
  const reduced = useReducedMotion();

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: '#F8FAFF', minHeight: '93vh' }}
    >
      {/* ── Bokeh blobs ───────────────────────────────────────────────── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Primary teal blob — top right */}
        <div style={{
          position: 'absolute', top: '-8%', right: '10%',
          width: 560, height: 560, borderRadius: '50%',
          background: 'rgba(15,118,110,0.11)', filter: 'blur(90px)',
        }} />
        {/* Secondary teal — mid right */}
        <div style={{
          position: 'absolute', top: '35%', right: '-8%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'rgba(20,184,166,0.08)', filter: 'blur(80px)',
        }} />
        {/* Warm amber — bottom left */}
        <div style={{
          position: 'absolute', bottom: '-5%', left: '5%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'rgba(245,158,11,0.07)', filter: 'blur(100px)',
        }} />
        {/* Sky blue — top left corner */}
        <div style={{
          position: 'absolute', top: '10%', left: '-5%',
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(56,189,248,0.06)', filter: 'blur(80px)',
        }} />
      </div>

      <div className="container-page relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center py-20 lg:py-28">

        {/* ── Left: Copy ─────────────────────────────────────────────── */}
        <motion.div
          variants={reduced ? {} : stagger}
          initial="hidden"
          animate="show"
          className="max-w-[560px]"
        >
          {/* Eyebrow */}
          <motion.div variants={reduced ? {} : fadeUp}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]/60">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"
                style={{ animation: 'dot-pulse 2s ease-in-out infinite' }}
              />
              {t('eyebrow')}
            </span>
          </motion.div>

          {/* H1 — SEO-optimized, minimal weight contrast */}
          <motion.h1
            variants={reduced ? {} : fadeUp}
            className="mt-5 leading-[1.06] tracking-[-2px] text-balance text-[#0F172A]"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900 }}
          >
            {t('title')}{' '}
            <span style={{
              background: 'linear-gradient(110deg, #0F766E 0%, #0D9488 50%, #14B8A6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {t('titleAccent')}
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={reduced ? {} : fadeUp}
            className="mt-5 leading-[1.8] text-pretty text-[#4E5A6B]"
            style={{ fontSize: 'clamp(15px, 1.35vw, 17px)', fontWeight: 450 }}
          >
            {t('description')}
          </motion.p>

          {/* CTAs */}
          <motion.div variants={reduced ? {} : fadeUp} className="flex flex-wrap gap-3 mt-8">
            <a
              href="#signup"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14.5px] font-bold text-white no-underline transition-all duration-200 hover:-translate-y-0.5 select-none"
            >
              {t('ctaPrimary')}
              <ArrowRight size={15} strokeWidth={2.5} />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-[14.5px] font-semibold no-underline bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#0F172A] hover:border-[#CBD5E1] transition-all duration-150 select-none"
            >
              <Play size={14} strokeWidth={2} className="fill-current" />
              {t('ctaSecondary')}
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={reduced ? {} : fadeUp}
            className="mt-10 pt-8 flex flex-wrap gap-8"
            style={{ borderTop: '1px solid rgba(15,23,42,0.07)' }}
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <div
                  className="font-black tracking-tight text-[#0F172A]"
                  style={{ fontSize: 'clamp(18px, 1.8vw, 24px)' }}
                >
                  {stat.value}
                </div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#94A3B8] mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Right: Screenshot carousel ─────────────────────────────── */}
        <motion.div
          className="flex justify-center lg:justify-end"
          initial={reduced ? false : { opacity: 0 }}
          animate={reduced ? {} : { opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.18, ease: EASE }}
        >
          <ScreenshotCarousel reduced={!!reduced} />
        </motion.div>

      </div>
    </section>
  );
}

/* ── Screenshot carousel ──────────────────────────────────────────────── */

function ScreenshotCarousel({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative w-full max-w-[480px]">
      {/* Gradient edge fades */}
      <div
        aria-hidden
        className="absolute inset-y-0 start-0 w-[18%] z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #F8FAFF 0%, transparent 100%)' }}
      />
      <div
        aria-hidden
        className="absolute inset-y-0 end-0 w-[18%] z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #F8FAFF 0%, transparent 100%)' }}
      />

      {/* Cards — justify-center auto-clips sides */}
      <div className="overflow-hidden py-10">
        <motion.div
          className="flex justify-center items-end gap-3"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={reduced ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.68, delay: 0.3, ease: EASE }}
        >
          {/* Left: Sales Report */}
          <SideCard reduced={reduced}>
            <ReportScreen />
          </SideCard>

          {/* Center: POS Checkout */}
          <CenterCard reduced={reduced}>
            <POSScreen />
          </CenterCard>

          {/* Right: Inventory */}
          <SideCard reduced={reduced}>
            <InventoryScreen />
          </SideCard>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Card shells ──────────────────────────────────────────────────────── */

function CenterCard({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  return (
    <motion.div
      className="shrink-0 rounded-[22px] overflow-hidden bg-white relative z-10"
      style={{
        width: 220,
        height: 420,
        boxShadow:
          '0 24px 64px -12px rgba(15,118,110,0.22), ' +
          '0 8px 24px -4px rgba(15,23,42,0.10), ' +
          '0 0 0 1px rgba(15,118,110,0.12)',
      }}
      animate={reduced ? {} : { y: [0, -8, 0] }}
      transition={reduced ? {} : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

function SideCard({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  return (
    <motion.div
      className="shrink-0 rounded-[18px] overflow-hidden bg-white relative"
      style={{
        width: 200,
        height: 370,
        opacity: 0.72,
        boxShadow: '0 12px 32px -8px rgba(15,23,42,0.10), 0 0 0 1px rgba(15,23,42,0.06)',
      }}
      animate={reduced ? {} : { y: [0, -5, 0] }}
      transition={reduced ? {} : { duration: 6.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Screen 1: Sales Report / Dashboard ─────────────────────────────── */

function ReportScreen() {
  const bars = [55, 72, 48, 88, 65, 94, 78];
  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-3 pt-4 pb-2.5 flex items-center justify-between border-b border-[#F1F5F9]">
        <div>
          <p className="text-[8px] font-semibold text-[#94A3B8] uppercase tracking-wide">Today</p>
          <p className="text-[10px] font-black text-[#0F172A]">Sales Report</p>
        </div>
        <div className="w-5 h-5 rounded-md bg-[#0F766E]/10 flex items-center justify-center">
          <TrendingUp size={10} className="text-[#0F766E]" strokeWidth={2.5} />
        </div>
      </div>

      {/* Revenue */}
      <div className="px-3 pt-3.5 pb-2">
        <p className="text-[8.5px] text-[#94A3B8] font-semibold mb-0.5">Total revenue</p>
        <p className="text-[22px] font-black text-[#0F172A] leading-none tracking-tight">
          42,800
          <span className="text-[9px] font-semibold text-[#94A3B8] ms-1">SDG</span>
        </p>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
        {[['Sales', '24'], ['Orders', '18'], ['Avg', '1,783']].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-white border border-[#F1F5F9] p-1.5 text-center">
            <p className="text-[11px] font-black text-[#0F172A]">{v}</p>
            <p className="text-[7.5px] text-[#94A3B8] mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="flex-1 px-3 pb-3">
        <div className="bg-white rounded-xl border border-[#F1F5F9] p-2.5 h-full">
          <p className="text-[7.5px] font-bold text-[#94A3B8] mb-2">Weekly trend</p>
          <div className="flex items-end gap-1 h-[65px]">
            {bars.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: i === 5
                    ? 'linear-gradient(180deg, #0F766E, #0D9488)'
                    : '#E2E8F0',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <span key={i} className="text-[6px] text-[#CBD5E1] flex-1 text-center">{d}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Screen 2: POS Checkout (center) ─────────────────────────────────── */

const POS_PRODUCTS = [
  { name: 'Cappuccino', price: '2,200', bg: '#F0FDFA', tint: '#0F766E' },
  { name: 'Karak Tea',  price: '1,200', bg: '#FEF9EC', tint: '#D97706' },
  { name: 'Croissant',  price: '1,800', bg: '#FDF2F8', tint: '#DB2777' },
  { name: 'Latte',      price: '2,400', bg: '#F0F9FF', tint: '#0284C7' },
] as const;

function POSScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-3 pt-5 pb-2.5 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-[#0F766E] grid place-items-center shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M9 22V12h6v10M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-[#0F172A]">AmanaPOS</p>
            <p className="text-[7px] text-[#64748B]">Khartoum · Branch 2</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]" style={{ animation: 'dot-pulse 2s ease-in-out infinite' }} />
            <span className="text-[6.5px] font-bold text-[#0F766E]">Online</span>
          </div>
        </div>
        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-hidden">
          {(['All', 'Coffee', 'Tea', 'Food'] as const).map((label, i) => (
            <div
              key={label}
              className="px-2 py-0.5 rounded-full text-[7px] font-bold shrink-0"
              style={i === 0
                ? { background: '#0F766E', color: 'white' }
                : { background: '#F1F5F9', color: '#64748B' }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-hidden px-2.5 pt-2 pb-16">
        <div className="grid grid-cols-2 gap-1.5">
          {POS_PRODUCTS.map(({ name, price, bg, tint }) => (
            <div key={name} className="bg-white rounded-[10px] p-1.5 border border-[#F1F5F9]">
              <div
                className="aspect-[1.25] rounded-md mb-1.5"
                style={{ background: bg }}
              />
              <p className="text-[7.5px] font-extrabold text-[#0F172A] leading-tight truncate">{name}</p>
              <p className="text-[7px] font-bold mt-0.5" style={{ color: tint }}>
                {price} <span className="text-[5.5px] text-[#94A3B8] font-medium">SDG</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Cart bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[18px] px-3 py-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#F0FDFA] flex items-center justify-center shrink-0">
          <ShoppingCart size={12} className="text-[#0F766E]" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[6.5px] text-[#64748B]">4 items</p>
          <p className="text-[10.5px] font-black text-[#0F172A] leading-tight">
            7,400 <span className="text-[5.5px] text-[#94A3B8] font-medium">SDG</span>
          </p>
        </div>
        <div
          className="text-white rounded-lg px-2.5 py-1.5 text-[7.5px] font-black"
          style={{ background: 'linear-gradient(135deg, #0F766E, #0D9488)' }}
        >
          Checkout
        </div>
      </div>
    </div>
  );
}

/* ── Screen 3: Inventory ─────────────────────────────────────────────── */

const INVENTORY_ITEMS = [
  { name: 'Cappuccino 500g', sku: 'BEV-001', qty: 48, status: 'in'  },
  { name: 'Karak Mix 250g',  sku: 'BEV-004', qty: 3,  status: 'low' },
  { name: 'Croissant Pack',  sku: 'FOOD-02', qty: 0,  status: 'out' },
] as const;

function InventoryScreen() {
  return (
    <div className="h-full flex flex-col bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-3 pt-4 pb-2.5 flex items-center justify-between border-b border-[#F1F5F9]">
        <div>
          <p className="text-[8px] font-semibold text-[#94A3B8] uppercase tracking-wide">Stock</p>
          <p className="text-[10px] font-black text-[#0F172A]">Inventory</p>
        </div>
        <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center">
          <Package size={10} className="text-amber-600" strokeWidth={2.5} />
        </div>
      </div>

      {/* Alert banner */}
      <div className="mx-2.5 mt-2.5 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1.5">
        <p className="text-[7.5px] font-bold text-amber-700">2 items need restocking</p>
      </div>

      {/* Item list */}
      <div className="flex-1 px-2.5 pt-2 space-y-1.5">
        {INVENTORY_ITEMS.map(({ name, sku, qty, status }) => (
          <div key={sku} className="bg-white rounded-[10px] border border-[#F1F5F9] px-2.5 py-2 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[7.5px] font-bold text-[#0F172A] truncate">{name}</p>
              <p className="font-mono text-[6px] text-[#94A3B8] mt-0.5">{sku}</p>
            </div>
            <div className="text-end shrink-0">
              <p className="text-[9px] font-black text-[#0F172A] tabular-nums">{qty}</p>
              <div
                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[5.5px] font-bold mt-0.5"
                style={
                  status === 'out' ? { background: '#FEF2F2', color: '#DC2626' } :
                  status === 'low' ? { background: '#FFFBEB', color: '#D97706' } :
                                     { background: '#F0FDF4', color: '#16A34A' }
                }
              >
                <span className="w-1 h-1 rounded-full" style={{
                  background:
                    status === 'out' ? '#DC2626' :
                    status === 'low' ? '#D97706' : '#16A34A'
                }} />
                {status === 'out' ? 'Out' : status === 'low' ? 'Low' : 'OK'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="mx-2.5 mb-3 mt-2 rounded-lg bg-white border border-[#F1F5F9] px-2.5 py-2">
        <div className="flex justify-between">
          <p className="text-[7px] text-[#94A3B8]">Total SKUs</p>
          <p className="text-[7px] font-bold text-[#0F172A]">142</p>
        </div>
        <div className="flex justify-between mt-0.5">
          <p className="text-[7px] text-[#94A3B8]">In stock</p>
          <p className="text-[7px] font-bold text-green-600">128</p>
        </div>
      </div>
    </div>
  );
}
