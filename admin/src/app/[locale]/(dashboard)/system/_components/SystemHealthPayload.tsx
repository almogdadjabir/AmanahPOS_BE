import Badge from "@/components/ui/Badge";

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

export default function SystemHealthPayload({ health }: Props) {
  if (!health) return null;

  const sysOk = health.status === "ok";

  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">
            Diagnostics
          </p>
          <p className="mt-0.5 text-xs text-text-hint">
            Raw backend health response for debugging.
          </p>
        </div>

        <Badge variant={sysOk ? "success" : "danger"} dot>
          {health.status ?? "unknown"}
        </Badge>
      </div>

      <div className="bg-surface-soft p-4">
        <div className="overflow-hidden rounded-xl border border-border-soft bg-white">
          <div className="flex items-center gap-1.5 border-b border-border-soft px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="ms-2 text-[11px] font-semibold text-text-hint">
              health.json
            </span>
          </div>

          <pre className="max-h-[320px] overflow-x-auto overflow-y-auto p-4 text-[12px] leading-relaxed text-text-secondary">
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
