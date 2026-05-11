"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useSubscriptionDrawer } from "./SubscriptionDrawerContext";

export default function CreateSubscriptionButton() {
  const { openCreate } = useSubscriptionDrawer();
  const t = useTranslations("subscriptions");

  return (
    <Button size="sm" onClick={openCreate} className="gap-1.5">
      <Plus className="size-3.5" />
      {t("createSubscription")}
    </Button>
  );
}
