import type { AdminHealth } from "./types";
import { CacheIcon, DbIcon, ShieldAlertIcon, ShieldCheckIcon } from "./icons";

type Props = {
  health: AdminHealth;
};

export default function AdminSystemHealth({ health }: Props) {
  if (!health) return null;

  const dbOk = health.checks?.database === "ok";
  const cacheOk = health.checks?.cache === "ok";
  const sysOk = health.status === "ok";

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 shadow-card ${
        sysOk ? "bg-white border-success/20" : "bg-white border-danger/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            sysOk
              ? "bg-success-light text-success"
              : "bg-danger-light text-danger"
          }`}
        >
          {sysOk ? <ShieldCheckIcon /> : <ShieldAlertIcon />}

          {sysOk && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
              <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-success" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-bold text-text-primary">
              {sysOk ? "All systems operational" : "System degraded"}
            </p>

            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                sysOk
                  ? "bg-success-light text-success"
                  : "bg-danger-light text-danger"
              }`}
            >
              {sysOk ? "Live" : "Action needed"}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-text-hint">
            {sysOk
              ? "API, database, and cache are running normally."
              : "One or more services need attention. Check the logs."}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <HealthPill ok={dbOk} icon={<DbIcon />} label="Database" />
          <HealthPill ok={cacheOk} icon={<CacheIcon />} label="Cache" />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
        <HealthPill ok={dbOk} icon={<DbIcon />} label="Database" />
        <HealthPill ok={cacheOk} icon={<CacheIcon />} label="Cache" />
      </div>
    </div>
  );
}

function HealthPill({
  ok,
  icon,
  label,
}: {
  ok: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold ${
        ok
          ? "border-success/20 bg-success-light text-success"
          : "border-danger/20 bg-danger-light text-danger"
      }`}
    >
      {icon}
      <span>{label}</span>
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok ? "bg-success" : "bg-danger"
        }`}
      />
    </div>
  );
}
