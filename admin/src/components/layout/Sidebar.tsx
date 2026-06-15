'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import Logo from '@/components/ui/Logo';
import { logoutAction } from '@/actions/auth';
import { cn } from '@/lib/utils';
import type { UserProfile, BusinessType } from '@/types/api';
import {
  LayoutGrid, Users, Store, CreditCard, Server,
  Receipt, Package, BarChart2, UserCheck, CreditCard as SubIcon,
  LogOut, History, Bell, Sparkles, ChevronRight, Settings,
} from 'lucide-react';

const ADMIN_NAV = [
  { key: 'dashboard',     href: '/',               Icon: LayoutGrid },
  { key: 'owners',        href: '/owners',          Icon: Users },
  { key: 'businesses',    href: '/businesses',      Icon: Store },
  { key: 'subscriptions', href: '/subscriptions',   Icon: CreditCard },
  { key: 'plans',         href: '/plans',           Icon: Package },
  { key: 'notifications', href: '/notifications',   Icon: Bell },
  { key: 'activityLogs',  href: '/activity-logs',   Icon: History },
  { key: 'system',        href: '/system',          Icon: Server },
] as const;

const OWNER_NAV = [
  { key: 'dashboard',    href: '/',             Icon: LayoutGrid },
  { key: 'sales',        href: '/sales',        Icon: Receipt },
  { key: 'products',     href: '/products',     Icon: Package },
  { key: 'inventory',    href: '/inventory',    Icon: BarChart2 },
  { key: 'customers',    href: '/customers',    Icon: Users },
  { key: 'staff',        href: '/users',        Icon: UserCheck },
  { key: 'subscription', href: '/subscription', Icon: SubIcon },
  { key: 'settings',     href: '/settings',     Icon: Settings },
] as const;

interface Props { profile: UserProfile; businessType?: BusinessType; isOpen: boolean; onClose: () => void }

export default function Sidebar({ profile, businessType, isOpen, onClose }: Props) {
  const tNav    = useTranslations('nav');
  const pathname = usePathname();
  const isAdmin  = profile.is_staff === true;
  const isPremiumInventory = Boolean(profile.enabled_features?.inventory_inbound_receiving);
  const ownerNav = businessType !== 'shop'
    ? OWNER_NAV.filter(item => item.key !== 'inventory')
    : OWNER_NAV;
  const navItems = isAdmin ? ADMIN_NAV : ownerNav;

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Sidebar shell — light, hairline border ───────────────────────── */}
      <aside className={cn(
        'fixed inset-y-0 start-0 z-30 w-[220px] flex flex-col',
        // Premium light: white bg, single hairline on the end edge
        'bg-card border-e border-border',
        'transition-transform duration-200 ease-in-out',
        'lg:translate-x-0 lg:static lg:z-auto',
        isOpen  ? 'translate-x-0' : '-translate-x-full',
        '[dir="rtl"]:start-auto [dir="rtl"]:end-0',
        !isOpen && '[dir="rtl"]:[transform:translateX(100%)]',
        isOpen  && '[dir="rtl"]:[transform:translateX(0)]',
      )}>

        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 h-[60px] shrink-0 border-b border-border">
          <Logo size={28} />
          <div>
            <div className="text-[13.5px] font-semibold text-foreground tracking-[-.015em] leading-tight">
              {isAdmin ? 'AmanaPOS' : (profile.full_name || 'AmanaPOS')}
            </div>
            <div className="text-[10px] font-medium leading-none mt-0.5 text-muted-foreground">
              {isAdmin ? tNav('platformAdmin') : tNav('adminBadge')}
            </div>
          </div>
        </div>

        {/* ── Section label ──────────────────────────────────────────────── */}
        <div className="px-3 pt-4 pb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[.09em] text-icon-rest px-2 mb-1.5">
            {isAdmin ? tNav('platformLabel') : tNav('businessLabel')}
          </p>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-px pb-2">
          {navItems.map(({ key, href, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px]',
                  'transition-[background,color] duration-140',
                  active
                    // Active: teal tint bg, primary-700 text, teal icons — no border-s
                    ? 'bg-primary-tint text-primary-700 font-medium [&_svg]:text-primary'
                    // Rest: muted text, icon-rest icons
                    : 'text-muted-foreground font-[450] hover:bg-muted hover:text-foreground [&_svg]:text-icon-rest hover:[&_svg]:text-muted-foreground',
                )}
              >
                <Icon size={16} className="shrink-0 transition-colors" />
                <span className="flex-1 truncate">{tNav(key as Parameters<typeof tNav>[0])}</span>
                {key === 'inventory' && isPremiumInventory && (
                  <Sparkles size={10} className="shrink-0 text-amber-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── User row + logout ───────────────────────────────────────────── */}
        <div className="px-2 pb-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 transition-colors hover:bg-muted cursor-default">
            {/* Initials avatar */}
            <div className="w-[30px] h-[30px] rounded-lg bg-muted flex items-center justify-center font-semibold text-[11.5px] text-muted-foreground shrink-0">
              {(profile.full_name || profile.phone).slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-medium text-foreground truncate leading-tight">
                {profile.full_name || profile.phone}
              </p>
              <p className="text-[10.5px] text-muted-foreground mt-px">{profile.phone}</p>
            </div>
            <ChevronRight size={13} className="text-icon-rest shrink-0" />
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-[450] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors [&_svg]:text-icon-rest"
            >
              <LogOut size={15} className="shrink-0" />
              {tNav('logout')}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
