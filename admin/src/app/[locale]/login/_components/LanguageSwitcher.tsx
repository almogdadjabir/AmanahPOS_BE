"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLanguage() {
    const nextLocale = locale === "ar" ? "en" : "ar";
    const newPathname = pathname.replace(/^\/(ar|en)/, `/${nextLocale}`);

    router.push(newPathname);
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className="absolute top-5 end-5 h-9 px-3 rounded-xl border border-border-soft bg-white text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-soft transition-all"
    >
      {locale === "ar" ? "English" : "العربية"}
    </button>
  );
}
