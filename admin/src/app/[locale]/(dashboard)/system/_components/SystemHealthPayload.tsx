"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Clipboard, Code2 } from "lucide-react";

import { cn } from "@/lib/utils";

type SystemHealth = {
  status?: string;
  checks?: {
    database?: string;
    cache?: string;
  };
} | null;

export default function SystemHealthPayload({
  health,
}: {
  health: SystemHealth;
}) {
  const t = useTranslations("system");
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => JSON.stringify(health, null, 2), [health]);

  if (!health) return null;

  const sysOk = health.status === "ok";

  async function handleCopy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_4px_0_rgb(0_0_0/.05)]">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <Code2 size={16} />
          </span>

          <div>
            <p className="text-sm font-bold text-foreground">
              {t("diagnostics")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t("diagnosticsSub")}
            </p>
          </div>
        </div>

        <span
          className={cn(
            "w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
            sysOk ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
          )}
        >
          {health.status ?? "unknown"}
        </span>
      </div>

      <div className="bg-[#0D1117]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="size-[11px] rounded-full bg-[#FF5F57]" />
            <span className="size-[11px] rounded-full bg-[#FFBD2E]" />
            <span className="size-[11px] rounded-full bg-[#28C840]" />

            <span className="ms-3 truncate font-mono text-[11px] tracking-wide text-white/35">
              health_check.json
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.09] px-2.5 py-1 text-[10px] font-semibold text-white/45 transition-colors hover:border-white/20 hover:text-white/75"
          >
            {copied ? <Check size={12} /> : <Clipboard size={12} />}
            {copied ? t("copied") : t("copy")}
          </button>
        </div>

        <pre
          dir="ltr"
          className="custom-scrollbar max-h-[320px] overflow-auto px-5 py-5 text-left font-mono text-[12px] leading-[1.75] text-[#E6EDF3]"
        >
          <JsonHighlight data={health} />
        </pre>
      </div>
    </div>
  );
}

function JsonHighlight({ data }: { data: object }) {
  const lines = JSON.stringify(data, null, 2).split("\n");

  return (
    <>
      {lines.map((line, index) => {
        const match = line.match(/^(\s*)("[\w]+")\s*:\s*(.*)/);

        if (match) {
          const [, indent, key, rest] = match;
          const trimmed = rest.replace(/,$/, "");
          const comma = rest.endsWith(",") ? "," : "";

          const valueColor =
            trimmed === "null"
              ? "#F47067"
              : trimmed === "true"
                ? "#7EE787"
                : trimmed === "false"
                  ? "#F47067"
                  : trimmed.startsWith('"')
                    ? "#A5D6FF"
                    : "#E6EDF3";

          return (
            <span key={index}>
              {indent}
              <span style={{ color: "#7EE787" }}>{key}</span>
              <span style={{ color: "#E6EDF3" }}>: </span>
              <span style={{ color: valueColor }}>{trimmed}</span>
              <span style={{ color: "#E6EDF3" }}>{comma}</span>
              {"\n"}
            </span>
          );
        }

        return (
          <span key={index} style={{ color: "#636E7B" }}>
            {line}
            {"\n"}
          </span>
        );
      })}
    </>
  );
}
