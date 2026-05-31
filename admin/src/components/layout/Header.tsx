"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Search } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

export default function Header({
  title,
  onMenuClick,
  userName = "Admin",
}: {
  title: string;
  onMenuClick: () => void;
  userName?: string;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as "ar" | "en";
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const target = locale === "ar" ? "en" : "ar";

  function switchLocale() {
    const newPath = pathname.replace(`/${locale}`, `/${target}`);
    startTransition(() => router.replace(newPath));
  }

  return (
    // Frosted glass header — 60px, blurred canvas bg, single hairline bottom
    <header className="sticky top-0 z-10 h-[60px] bg-background/80 backdrop-saturate-[180%] backdrop-blur-md border-b border-border flex items-center gap-3 px-6 shrink-0">

      {/* Mobile menu trigger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 -ms-1 rounded-md text-icon-rest hover:bg-muted hover:text-muted-foreground transition-colors active:translate-y-px"
        aria-label="Menu"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Page title — hidden on mobile, overridden by breadcrumb on desktop */}
      <h1 className="flex-1 text-[14px] font-semibold text-foreground tracking-[-.015em] lg:hidden">
        {title}
      </h1>

      {/* Breadcrumb — desktop only */}
      <div className="hidden lg:flex items-center gap-1.5 flex-1 text-[13px] text-muted-foreground font-[450]">
        <span className="font-medium text-foreground">{title}</span>
      </div>

      {/* Right cluster — 34px tall, 8px gaps */}
      <div className="flex items-center gap-2">

        {/* Search — frosted style, ⌘K hint */}
        <div className="hidden md:flex items-center gap-2 h-[34px] w-[220px] px-2.5 rounded-md border border-input bg-card text-muted-foreground cursor-text transition-[border-color] hover:border-border-strong">
          <Search size={14} className="shrink-0 text-icon-rest" />
          <span className="flex-1 text-[13px]">{t('searchPlaceholder')}</span>
          <kbd className="font-mono text-[10.5px] text-muted-foreground bg-muted border border-input rounded px-1.5 py-px">⌘K</kbd>
        </div>

        {/* Online / synced pill */}
        <div className="hidden sm:inline-flex items-center gap-1.5 h-[28px] px-2.5 rounded-full bg-success-light text-success text-[11.5px] font-[550]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#12B981] online-dot shrink-0" />
          Synced
        </div>

        {/* Locale toggle — segmented */}
        <div className="flex border border-input rounded-md overflow-hidden h-[34px] shrink-0">
          <button
            onClick={locale === "ar" ? undefined : switchLocale}
            disabled={isPending}
            className={`px-2.5 text-[12px] font-[550] transition-[background,color] duration-140 disabled:opacity-40
              ${locale === "ar" ? "bg-primary-tint text-primary-700" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}
            `}
          >
            ع
          </button>
          <div className="w-px bg-border shrink-0" />
          <button
            onClick={locale === "en" ? undefined : switchLocale}
            disabled={isPending}
            className={`px-2.5 text-[12px] font-[550] transition-[background,color] duration-140 disabled:opacity-40
              ${locale === "en" ? "bg-primary-tint text-primary-700" : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}
            `}
          >
            EN
          </button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2 cursor-default select-none">
          <Avatar name={userName} size={30} />
        </div>
      </div>
    </header>
  );
}
