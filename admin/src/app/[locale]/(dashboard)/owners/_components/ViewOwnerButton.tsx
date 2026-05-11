"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useOwnerDrawer } from "./OwnerDrawerContext";

export default function ViewOwnerButton({ ownerId }: { ownerId: string }) {
  const { openView } = useOwnerDrawer();
  const t = useTranslations("owners");
  const locale = useLocale();

  const isRtl = locale === "ar";
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <button
      type="button"
      onClick={() => openView(ownerId)}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-md"
    >
      {t("view")}
      <ArrowIcon className="size-3" />
    </button>
  );
}
