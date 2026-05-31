"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
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
    <header className="sticky top-0 z-10 h-14 bg-white shadow-header flex items-center gap-3 px-4 shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ms-1 rounded-md text-muted-foreground hover:bg-muted hover:text-muted-foreground transition-colors"
        aria-label="Menu"
      >
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
      </button>

      <h1 className="flex-1 text-[15px] font-semibold text-foreground">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        <button
          onClick={switchLocale}
          disabled={isPending}
          className="h-8 px-3 rounded-md border border-border bg-white text-xs font-semibold text-muted-foreground hover:bg-muted hover:border-border hover:text-foreground transition-all disabled:opacity-40"
        >
          {t("switchLocale")}
        </button>

        <div className="w-px h-5 bg-border-soft mx-1" />

        <div className="flex items-center gap-2 cursor-default select-none">
          <Avatar name={userName} size={30} />
          <span className="hidden sm:block text-[13px] font-medium text-muted-foreground">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
