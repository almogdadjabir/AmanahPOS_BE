"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock3, ShieldCheck, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type SystemHealth = {
  status?: string;
  checks?: {
    database?: string;
    cache?: string;
  };
} | null;

export default function SystemStatusHero({ health }: { health: SystemHealth }) {
  const t = useTranslations("system");

  const [time, setTime] = useState("");
  const [mounted, setMounted] = useState(false);

  const dbOk = health?.checks?.database === "ok";
  const cacheOk = health?.checks?.cache === "ok";
  const sysOk = health?.status === "ok";

  useEffect(() => {
    setMounted(true);

    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "UTC",
        }),
      );
    };

    tick();

    const timer = window.setInterval(tick, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card px-5 py-5 shadow-card sm:px-7 sm:py-6",
        sysOk ? "border-success/15" : "border-danger/20",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1",
          sysOk ? "bg-success" : "bg-danger",
        )}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex shrink-0 items-center gap-3">
          <span className="relative flex size-3">
            <span
              className={cn(
                "absolute inline-flex size-full animate-ping rounded-full opacity-40",
                sysOk ? "bg-success" : "bg-danger",
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-3 rounded-full",
                sysOk ? "bg-success" : "bg-danger",
              )}
            />
          </span>

          <span
            className={cn(
              "text-[11px] font-black uppercase tracking-[0.14em]",
              sysOk ? "text-success" : "text-danger",
            )}
          >
            {sysOk ? t("hero.live") : t("hero.alert")}
          </span>
        </div>

        <div className="hidden h-12 w-px shrink-0 bg-border lg:block" />

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-start gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                sysOk
                  ? "bg-success/10 text-success ring-success/15"
                  : "bg-danger/10 text-danger ring-danger/15",
              )}
            >
              {sysOk ? <ShieldCheck size={18} /> : <TriangleAlert size={18} />}
            </span>

            <div className="min-w-0">
              <h2 className="text-[21px] font-black leading-tight tracking-tight text-foreground">
                {sysOk ? t("hero.operationalTitle") : t("hero.degradedTitle")}
              </h2>

              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {sysOk
                  ? t("hero.operationalDescription")
                  : t("hero.degradedDescription")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ServicePill label={t("services.apiGateway")} ok={sysOk} />
            <ServicePill label={t("services.database")} ok={dbOk} />
            <ServicePill label={t("services.cache")} ok={cacheOk} />
          </div>
        </div>

        <div className="hidden shrink-0 rounded-xl border border-border bg-muted/20 px-5 py-4 text-center lg:block">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-muted-foreground">
            <Clock3 size={13} />
            <p className="text-[10px] font-black uppercase tracking-[0.18em]">
              {t("hero.serverTime")}
            </p>
          </div>

          <p className="font-mono text-[24px] font-black leading-none text-foreground tabular-nums">
            {mounted ? time : "——:——:——"}
          </p>

          <p className="mt-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground">
            UTC
          </p>
        </div>
      </div>
    </div>
  );
}

function ServicePill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
        ok
          ? "border-success/20 bg-success/5 text-success"
          : "border-danger/20 bg-danger/5 text-danger",
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", ok ? "bg-success" : "bg-danger")}
      />
      {label}
    </div>
  );
}
