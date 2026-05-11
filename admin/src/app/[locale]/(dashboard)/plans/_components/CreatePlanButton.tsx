"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { usePlanDrawer } from "./PlanDrawerContext";

export default function CreatePlanButton() {
  const t = useTranslations("plans");
  const { openCreate } = usePlanDrawer();

  return (
    <Button
      type="button"
      size="sm"
      onClick={openCreate}
      className="gap-1.5"
      aria-label={t("newPlan")}
    >
      <Plus className="size-3.5" aria-hidden="true" />
      <span>{t("newPlan")}</span>
    </Button>
  );
}
