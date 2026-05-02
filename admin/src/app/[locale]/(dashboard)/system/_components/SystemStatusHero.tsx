type SystemHealth = {
  status?: string;
  checks?: {
    database?: string;
    cache?: string;
  };
} | null;

type Props = {
  health: SystemHealth;
};

export default function SystemStatusHero({ health }: Props) {
  const dbOk = health?.checks?.database === "ok";
  const cacheOk = health?.checks?.cache === "ok";
  const sysOk = health?.status === "ok";

  const healthyChecks = [sysOk, dbOk, cacheOk].filter(Boolean).length;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border shadow-card ${
        sysOk ? "border-success/20 bg-white" : "border-danger/20 bg-white"
      }`}
    >
      <div
        className={`absolute inset-y-0 start-0 w-1 ${
          sysOk ? "bg-success" : "bg-danger"
        }`}
      />

      <div className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
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

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[18px] font-black text-text-primary">
                  {sysOk ? "All systems operational" : "System degraded"}
                </p>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    sysOk
                      ? "bg-success-light text-success"
                      : "bg-danger-light text-danger"
                  }`}
                >
                  {sysOk ? "Live" : "Action needed"}
                </span>
              </div>

              <p className="mt-1 max-w-xl text-sm text-text-secondary">
                {sysOk
                  ? "Core platform services are healthy. Admins and owners can continue using the dashboard normally."
                  : "One or more platform services are not responding as expected. Review diagnostics below."}
              </p>

              <p className="mt-2 text-xs text-text-hint">
                Last checked from current server response
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl border border-border-soft bg-surface-soft p-2 lg:min-w-[260px]">
            <MiniMetric label="Checks" value={`${healthyChecks}/3`} />
            <MiniMetric
              label="Database"
              value={dbOk ? "OK" : "Fail"}
              ok={dbOk}
            />
            <MiniMetric
              label="Cache"
              value={cacheOk ? "OK" : "Fail"}
              ok={cacheOk}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  ok = true,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-hint">
        {label}
      </p>
      <p
        className={`mt-1 text-[13px] font-black ${
          ok ? "text-text-primary" : "text-danger"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ShieldCheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ShieldAlertIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
