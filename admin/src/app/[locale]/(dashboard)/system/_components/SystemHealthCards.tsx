"use client";

import { useTranslations } from "next-intl";
import { Activity, Database, Server, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";

type SystemHealth = {
  status?: string;
  checks?: {
    database?: string;
    cache?: string;
  };
} | null;

export default function SystemHealthCards({
  health,
}: {
  health: SystemHealth;
}) {
  const t = useTranslations("system");

  const dbOk = health?.checks?.database === "ok";
  const cacheOk = health?.checks?.cache === "ok";
  const sysOk = health?.status === "ok";

  const items = [
    {
      label: t("cards.api.label"),
      value: sysOk ? t("cards.api.okValue") : t("cards.api.failValue"),
      ok: sysOk,
      description: sysOk
        ? t("cards.api.okDescription")
        : t("cards.api.failDescription"),
      strength: sysOk ? 5 : 1,
      icon: Server,
    },
    {
      label: t("cards.database.label"),
      value: dbOk ? t("cards.database.okValue") : t("cards.database.failValue"),
      ok: dbOk,
      description: dbOk
        ? t("cards.database.okDescription")
        : t("cards.database.failDescription"),
      strength: dbOk ? 5 : 1,
      icon: Database,
    },
    {
      label: t("cards.cache.label"),
      value: cacheOk ? t("cards.cache.okValue") : t("cards.cache.failValue"),
      ok: cacheOk,
      description: cacheOk
        ? t("cards.cache.okDescription")
        : t("cards.cache.failDescription"),
      strength: cacheOk ? 5 : 1,
      icon: cacheOk ? Activity : WifiOff,
    },
  ];

  return (
    <>
      <style>{`
        @keyframes system-card-in {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes system-bar-grow {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }

        .system-card-in {
          animation: system-card-in .35s ease-out both;
        }

        .system-bar-grow {
          transform-origin: bottom;
          animation: system-bar-grow .35s cubic-bezier(.34,1.56,.64,1) both;
        }
      `}</style>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className={cn(
                "system-card-in group overflow-hidden rounded-xl border bg-card shadow-[0_1px_4px_0_rgb(0_0_0/.05)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-card",
                item.ok ? "border-success/15" : "border-danger/20",
              )}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div
                className={cn(
                  "h-1 w-full",
                  item.ok ? "bg-success" : "bg-danger",
                )}
              />

              <div className="p-5">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl ring-1",
                        item.ok
                          ? "bg-success/10 text-success ring-success/15"
                          : "bg-danger/10 text-danger ring-danger/15",
                      )}
                    >
                      <Icon size={18} />
                    </span>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-[10px] font-black uppercase tracking-[0.12em]",
                          item.ok ? "text-success" : "text-danger",
                        )}
                      >
                        {item.ok ? t("status.ok") : t("status.fail")}
                      </p>
                    </div>
                  </div>
                </div>

                <p
                  className={cn(
                    "mb-2 text-[26px] font-black leading-none tracking-tight",
                    item.ok ? "text-foreground" : "text-danger",
                  )}
                >
                  {item.value}
                </p>

                <p className="mb-5 min-h-[38px] text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>

                <div className="flex h-7 items-end gap-1">
                  {[8, 12, 16, 20, 24].map((height, barIndex) => (
                    <div
                      key={barIndex}
                      className={cn(
                        "system-bar-grow w-[5px] rounded-full",
                        barIndex < item.strength
                          ? item.ok
                            ? "bg-success"
                            : "bg-danger"
                          : "bg-border",
                      )}
                      style={{
                        height,
                        animationDelay: `${index * 70 + barIndex * 45}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
