"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOwnerDrawer } from "./OwnerDrawerContext";
import { Button } from "@/components/ui/button";

export default function CreateOwnerButton() {
  const { openCreate } = useOwnerDrawer();
  const t = useTranslations("owners");

  return (
    <Button variant="default" size="sm" type="button" onClick={openCreate}>
      <Plus className="size-3.5" />
      {t("createOwner")}
    </Button>
  );
}
