"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { UserProfile } from "@/types/api";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import Logo from "@/components/ui/Logo";
import UserMenu from "./UserMenu";

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

  const routeKey  = "/" + pathname.split("/").slice(2).join("/");
  const pageKey   = PAGE_TITLES[routeKey] ?? "dashboard";

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
  const pageTitle = (isAdmin ? adminTitles : ownerTitles)[pageKey] ?? "Dashboard";

  function switchLocale() {
    const target = locale === "ar" ? "en" : "ar";
    const segs = pathname.split("/");
    segs[1] = target;
    startTransition(() => router.replace(segs.join("/")));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        profile={profile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-10 h-14 bg-card border-b border-border flex items-center gap-3 px-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className={cn(
              "lg:hidden p-1.5 -ms-1 rounded-md",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              "transition-colors",
            )}
          >
            <Menu size={18} />
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2">
            <Logo size={24} />
          </div>

          {/* Page title */}
          <h1 className="flex-1 text-sm font-semibold text-foreground hidden lg:block">
            {pageTitle}
          </h1>

          <div className="flex items-center gap-2 ms-auto">
            {/* Admin badge */}
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                Platform Admin
              </span>
            )}

            {/* Locale switcher */}
            <button
              onClick={switchLocale}
              disabled={isPending}
              className={cn(
                "h-8 px-3 rounded-md border border-border",
                "text-xs font-semibold text-muted-foreground",
                "hover:bg-muted hover:text-foreground",
                "transition-all disabled:opacity-40",
              )}
            >
              {tCommon("switchLocale")}
            </button>

            <div className="w-px h-5 bg-border mx-1" />

            {/* User menu */}
            <UserMenu profile={profile} />
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
