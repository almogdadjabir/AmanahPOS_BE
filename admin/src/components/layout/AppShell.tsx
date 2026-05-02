"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import type { UserProfile } from "@/types/api";
import Sidebar from "./Sidebar";
import Avatar from "@/components/ui/Avatar";
import Logo from "@/components/ui/Logo";

const PAGE_TITLES: Record<string, string> = {
  "/": "dashboard",
  "/owners": "owners",
  "/businesses": "businesses",
  "/subscriptions": "subscriptions",
  "/system": "system",
  "/sales": "sales",
  "/products": "products",
  "/inventory": "inventory",
  "/customers": "customers",
  "/users": "staff",
  "/subscription": "subscription",
  "/settings": "settings",
};

interface Props {
  profile: UserProfile;
  children: React.ReactNode;
}

export default function AppShell({ profile, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const isAdmin = profile.is_staff === true;

  // Strip locale prefix to get the route key
  const routeKey = "/" + pathname.split("/").slice(2).join("/");
  const pageKey = PAGE_TITLES[routeKey] ?? "dashboard";

  // Determine page title — admin and owner have overlapping keys
  const adminTitles: Record<string, string> = {
    dashboard: "Dashboard",
    owners: "Owner Accounts",
    businesses: "Businesses",
    subscriptions: "Subscriptions",
    system: "System Health",
    settings: "Settings",
  };
  const ownerTitles: Record<string, string> = {
    dashboard: "Dashboard",
    sales: "Sales",
    products: "Products",
    inventory: "Inventory",
    customers: "Customers",
    staff: "Staff",
    subscription: "My Subscription",
    settings: "Settings",
  };
  const titles = isAdmin ? adminTitles : ownerTitles;
  const pageTitle = titles[pageKey] ?? "Dashboard";

  function switchLocale() {
    const target = locale === "ar" ? "en" : "ar";
    const segs = pathname.split("/");
    segs[1] = target;
    startTransition(() => router.replace(segs.join("/")));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-soft">
      <Sidebar
        profile={profile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 h-14 bg-white shadow-header flex items-center gap-3 px-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ms-1 rounded-md text-text-hint hover:bg-surface-muted transition-colors"
          >
            <HamburgerIcon />
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <Logo size={24} />
          </div>

          <h1 className="flex-1 text-[15px] font-semibold text-text-primary hidden lg:block">
            {pageTitle}
          </h1>

          <div className="flex items-center gap-2 ms-auto">
            {/* Admin badge */}
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-primary-soft text-primary text-[11px] font-semibold">
                Platform Admin
              </span>
            )}

            <button
              onClick={switchLocale}
              disabled={isPending}
              className="h-8 px-3 rounded-md border border-border-soft text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-all disabled:opacity-40"
            >
              {tCommon("switchLocale")}
            </button>

            <div className="w-px h-5 bg-border-soft mx-1" />

            <div className="flex items-center gap-2 cursor-default select-none">
              <Avatar name={profile.full_name || profile.phone} size={30} />
              <span className="hidden sm:block text-[13px] font-medium text-text-secondary">
                {profile.full_name || profile.phone}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
