"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Menu, ChevronRight } from "lucide-react";
import type { UserProfile, BusinessType } from "@/types/api";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import Logo from "@/components/ui/Logo";
import UserMenu from "./UserMenu";
import NavProgress from "@/components/NavProgress";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

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
  "/notifications":          "notifications",
  "/notifications/templates":"notifications",
  "/notifications/sender":   "notifications",
  "/notifications/logs":     "notifications",
  "/notifications/settings": "notifications",
};

interface Props {
  profile: UserProfile;
  businessType?: BusinessType;
  children: React.ReactNode;
}

export default function AppShell({ profile, businessType, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tCommon = useTranslations("common");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const isAdmin = profile.is_staff === true;

  const routeKey = "/" + pathname.split("/").slice(2).join("/");
  const pageKey = PAGE_TITLES[routeKey] ?? "dashboard";

  const adminTitles: Record<string, string> = {
    dashboard: "Dashboard",
    owners: "Owner Accounts",
    businesses: "Businesses",
    subscriptions: "Subscriptions",
    system: "System Health",
    settings: "Settings",
    notifications: "Notifications",
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
  const pageTitle =
    (isAdmin ? adminTitles : ownerTitles)[pageKey] ?? "Dashboard";

  function switchLocale() {
    const target = locale === "ar" ? "en" : "ar";
    const segs = pathname.split("/");
    segs[1] = target;
    startTransition(() => router.replace(segs.join("/")));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavProgress />
      <KeyboardShortcuts isAdmin={isAdmin} />
      <Sidebar
        profile={profile}
        businessType={businessType}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Fix #1: h-[60px] matches sidebar brand block → one continuous top hairline
            Fix #17: breadcrumbs on desktop
            Fix #3: EN|ع segmented control
            Fix #12: Live pill first in right cluster */}
        <header className="sticky top-0 z-10 h-[60px] bg-background/80 backdrop-saturate-[180%] backdrop-blur-md border-b border-border flex items-center gap-3 px-6 shrink-0">
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

          {/* Fix #17: breadcrumb — desktop only */}
          <nav className="hidden lg:flex items-center gap-1.5 flex-1 text-[13px]" aria-label="breadcrumb">
            <span className="text-muted-foreground font-[450]">
              {isAdmin ? "Platform" : "AmanaPOS"}
            </span>
            <ChevronRight size={13} className="text-icon-rest shrink-0 flip-rtl" />
            <span className="font-medium text-foreground">{pageTitle}</span>
          </nav>

          <div className="flex items-center gap-2 ms-auto lg:ms-0">
            {/* Fix #12: Live pill — admin only, first in right cluster */}
            {isAdmin && (
              <div className="hidden sm:inline-flex items-center gap-1.5 h-[34px] px-3 rounded-full bg-success-light text-success text-[12px] font-[550] shrink-0">
                <span className="w-[7px] h-[7px] rounded-full bg-[#12B981] online-dot shrink-0" />
                {tCommon("live")}
              </div>
            )}

            {/* Fix #3: EN|ع proper segmented control, 34px, aligned in cluster */}
            <div className="flex border border-input rounded-md overflow-hidden h-[34px] shrink-0">
              <button
                onClick={locale === "ar" ? undefined : switchLocale}
                disabled={isPending}
                className={cn(
                  "px-2.5 text-[12px] font-[550] transition-[background,color] duration-150 disabled:opacity-40",
                  locale === "ar"
                    ? "bg-primary-tint text-primary-700"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                ع
              </button>
              <div className="w-px bg-border shrink-0" />
              <button
                onClick={locale === "en" ? undefined : switchLocale}
                disabled={isPending}
                className={cn(
                  "px-2.5 text-[12px] font-[550] transition-[background,color] duration-150 disabled:opacity-40",
                  locale === "en"
                    ? "bg-primary-tint text-primary-700"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                EN
              </button>
            </div>

            <UserMenu profile={profile} />
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-6 [&>*]:animate-page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
