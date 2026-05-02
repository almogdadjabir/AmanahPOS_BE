'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import Logo from '@/components/ui/Logo';
import { logoutAction } from '@/actions/auth';
import { cn } from '@/lib/cn';
import type { UserProfile } from '@/types/api';

// ── Nav definitions ───────────────────────────────────────────────────────────

const ADMIN_NAV = [
  { key: 'dashboard',      href: '/',             icon: GridIcon },
  { key: 'owners',         href: '/owners',        icon: UsersIcon },
  { key: 'businesses',     href: '/businesses',    icon: StoreIcon },
  { key: 'subscriptions',  href: '/subscriptions', icon: CreditIcon },
  { key: 'system',         href: '/system',        icon: ServerIcon },
] as const;

const OWNER_NAV = [
  { key: 'dashboard',   href: '/',            icon: GridIcon },
  { key: 'sales',       href: '/sales',       icon: ReceiptIcon },
  { key: 'products',    href: '/products',    icon: BoxIcon },
  { key: 'inventory',   href: '/inventory',   icon: WarehouseIcon },
  { key: 'customers',   href: '/customers',   icon: UsersIcon },
  { key: 'staff',       href: '/users',       icon: TeamIcon },
  { key: 'subscription',href: '/subscription',icon: CreditIcon },
] as const;

interface Props { profile: UserProfile; isOpen: boolean; onClose: () => void }

export default function Sidebar({ profile, isOpen, onClose }: Props) {
  const tNav    = useTranslations('nav');
  const pathname = usePathname();
  const isAdmin = profile.is_staff === true;
  const navItems = isAdmin ? ADMIN_NAV : OWNER_NAV;

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-20 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed inset-y-0 start-0 z-30 w-[220px] bg-sidebar flex flex-col',
        'transition-transform duration-200 ease-in-out',
        'lg:translate-x-0 lg:static lg:z-auto',
        isOpen  ? 'translate-x-0' : '-translate-x-full',
        '[dir="rtl"]:start-auto [dir="rtl"]:end-0',
        !isOpen && '[dir="rtl"]:[transform:translateX(100%)]',
        isOpen  && '[dir="rtl"]:[transform:translateX(0)]',
      )}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b border-white/[0.07]">
          <Logo size={28} />
          <div>
            <div className="text-white text-[13px] font-bold leading-tight">
              {isAdmin ? 'AmanaPOS' : (profile.full_name || 'AmanaPOS')}
            </div>
            <div className="text-[10px] font-semibold leading-none mt-px text-primary-light/50">
              {isAdmin ? 'Platform Admin' : tNav('adminBadge')}
            </div>
          </div>
        </div>

        {/* Section label */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20">
            {isAdmin ? 'Platform' : 'Business'}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-px">
          {navItems.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              onClick={onClose}
              className={cn(
                'group flex items-center gap-2.5 px-3 py-[9px] rounded-md text-[13px] font-medium',
                'transition-all duration-150 border-s-2',
                isActive(href)
                  ? 'bg-white/10 text-white border-primary'
                  : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80 border-transparent',
              )}
            >
              <span className={cn(
                'shrink-0 transition-colors',
                isActive(href) ? 'text-primary-light' : 'text-white/30 group-hover:text-white/60',
              )}>
                <Icon size={15} />
              </span>
              {tNav(key as Parameters<typeof tNav>[0])}
            </Link>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-2 pb-3 border-t border-white/[0.07]">
          {/* User info */}
          <div className="px-3 py-2.5 mt-2 mb-1">
            <p className="text-[12px] font-semibold text-white/70 truncate">{profile.full_name || profile.phone}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{profile.phone}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-[9px] rounded-md text-[13px] font-medium text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-all"
            >
              <span className="shrink-0 text-white/25"><LogoutIcon size={15} /></span>
              {tNav('logout')}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function GridIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>; }
function UsersIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function StoreIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function CreditIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function ServerIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>; }
function ReceiptIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function BoxIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>; }
function WarehouseIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>; }
function TeamIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>; }
function LogoutIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
