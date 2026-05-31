import { getTranslations } from "next-intl/server";
import { Activity } from "lucide-react";

import { fetchHealth } from "@/services/admin";

import SystemErrorState from "./_components/SystemErrorState";
import SystemHealthCards from "./_components/SystemHealthCards";
import SystemHealthPayload from "./_components/SystemHealthPayload";
import SystemStatusHero from "./_components/SystemStatusHero";

export default async function SystemPage() {
  const t = await getTranslations("system");

  try {
    const health = await fetchHealth();

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info ring-1 ring-info/15 [&_svg]:size-5">
              <Activity />
            </span>

            <div className="min-w-0">
              <h1 className="text-[24px] font-black leading-tight tracking-tight text-foreground">
                {t("title")}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SystemStatusHero health={health} />
          <SystemHealthCards health={health} />
          <SystemHealthPayload health={health} />
        </div>
      </div>
    );
  } catch {
    return <SystemErrorState />;
  }
}
