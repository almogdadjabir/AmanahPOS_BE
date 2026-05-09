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
  LogOut, History,
} from 'lucide-react';

const ADMIN_NAV = [
  { key: 'dashboard',     href: '/',             Icon: LayoutGrid },
  { key: 'owners',        href: '/owners',        Icon: Users },
  { key: 'businesses',    href: '/businesses',    Icon: Store },
  { key: 'subscriptions', href: '/subscriptions', Icon: CreditCard },
  { key: 'plans',         href: '/plans',         Icon: Package },
  { key: 'activityLogs', href: '/activity-logs', Icon: History },
  { key: 'system',       href: '/system',        Icon: Server },
] as const;

const OWNER_NAV = [
  { key: 'dashboard',    href: '/',             Icon: LayoutGrid },
  { key: 'sales',        href: '/sales',        Icon: Receipt },
  { key: 'products',     href: '/products',     Icon: Package },
  { key: 'inventory',    href: '/inventory',    Icon: BarChart2 },
  { key: 'customers',    href: '/customers',    Icon: Users },
  { key: 'staff',        href: '/users',        Icon: UserCheck },
  { key: 'subscription', href: '/subscription', Icon: SubIcon },
] as const;

interface Props { profile: UserProfile; businessType?: BusinessType; isOpen: boolean; onClose: () => void }

export default function Sidebar({ profile, businessType, isOpen, onClose }: Props) {
  const tNav    = useTranslations('nav');
  const pathname = usePathname();
  const isAdmin  = profile.is_staff === true;
  const ownerNav = businessType !== 'shop'
    ? OWNER_NAV.filter(item => item.key !== 'inventory')
    : OWNER_NAV;
  const navItems = isAdmin ? ADMIN_NAV : ownerNav;

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'fixed inset-y-0 start-0 z-30 w-[220px] flex flex-col',
        'bg-sidebar',
        'transition-transform duration-200 ease-in-out',
        'lg:translate-x-0 lg:static lg:z-auto',
        isOpen  ? 'translate-x-0' : '-translate-x-full',
        '[dir="rtl"]:start-auto [dir="rtl"]:end-0',
        !isOpen && '[dir="rtl"]:[transform:translateX(100%)]',
        isOpen  && '[dir="rtl"]:[transform:translateX(0)]',
      )}>

        {/* ── Brand ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-white/[0.07]">
          <Logo size={28} />
          <div>
            <div className="text-white text-[13px] font-bold leading-tight">
              {isAdmin ? 'AmanaPOS' : (profile.full_name || 'AmanaPOS')}
            </div>
            <div className="text-[10px] font-semibold leading-none mt-0.5 text-primary-light/50">
              {isAdmin ? 'Platform Admin' : tNav('adminBadge')}
            </div>
          </div>
        </div>

        {/* ── Section label ──────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-1.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/20">
            {isAdmin ? 'Platform' : 'Business'}
          </p>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-px">
          {navItems.map(({ key, href, Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={href}
                onClick={onClose}
                className={cn(
                  'group flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium',
                  'transition-all duration-150 border-s-2',
                  active
                    ? 'bg-white/[0.09] text-white border-primary'
                    : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80 border-transparent',
                )}
              >
                <Icon
                  size={15}
                  className={cn(
                    'shrink-0 transition-colors',
                    active ? 'text-primary-light' : 'text-white/30 group-hover:text-white/60',
                  )}
                />
                {tNav(key as Parameters<typeof tNav>[0])}
              </Link>
            );
          })}
        </nav>

        {/* ── User + Logout ───────────────────────────────────────────────── */}
        <div className="px-2 pb-3 pt-1 border-t border-white/[0.07]">
          <div className="px-3 py-2.5 mt-1 mb-1">
            <p className="text-[12px] font-semibold text-white/70 truncate">
              {profile.full_name || profile.phone}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">{profile.phone}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-[9px] rounded-lg text-[13px] font-medium text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-all"
            >
              <LogOut size={15} className="shrink-0 text-white/25" />
              {tNav('logout')}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
