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

export default function SystemHealthCards({ health }: Props) {
  const dbOk = health?.checks?.database === "ok";
  const cacheOk = health?.checks?.cache === "ok";
  const sysOk = health?.status === "ok";

  const items = [
    {
      label: "Overall Status",
      value: sysOk ? "Operational" : "Degraded",
      ok: sysOk,
      description: sysOk
        ? "Platform gateway is responding normally."
        : "Platform gateway requires attention.",
      icon: <ActivityIcon />,
    },
    {
      label: "Database",
      value: dbOk ? "Connected" : "Error",
      ok: dbOk,
      description: dbOk
        ? "Primary database connection is healthy."
        : "Database health check failed.",
      icon: <DatabaseIcon />,
    },
    {
      label: "Cache",
      value: cacheOk ? "Connected" : "Disconnected",
      ok: cacheOk,
      description: cacheOk
        ? "Cache service is available."
        : "Cache service is currently unavailable.",
      icon: <CacheIcon />,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <SystemHealthCard key={item.label} item={item} />
      ))}
    </div>
  );
}

function SystemHealthCard({
  item,
}: {
  item: {
    label: string;
    value: string;
    ok: boolean;
    description: string;
    icon: React.ReactNode;
  };
}) {
  return (
    <div className="group bg-white rounded-xl border border-border-soft shadow-card p-5 transition-colors hover:border-primary/20">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            item.ok
              ? "bg-success-light text-success"
              : "bg-danger-light text-danger"
          }`}
        >
          {item.icon}
        </div>

        <StatusDot ok={item.ok} />
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-hint">
          {item.label}
        </p>

        <p
          className={`mt-2 text-[22px] font-black leading-none ${
            item.ok ? "text-text-primary" : "text-danger"
          }`}
        >
          {item.value}
        </p>

        <p className="mt-2 text-xs leading-relaxed text-text-hint">
          {item.description}
        </p>
      </div>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${
        ok ? "bg-success-light text-success" : "bg-danger-light text-danger"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ok ? "bg-success" : "bg-danger"
        }`}
      />
      <span className="text-[10px] font-bold uppercase tracking-wide">
        {ok ? "Healthy" : "Issue"}
      </span>
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function CacheIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}
